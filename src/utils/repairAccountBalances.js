import {
  getCompanyExpenses,
  getCompanyFinancialAccounts,
  updateCompanyExpense
} from '../firebase';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Analyze expense account discrepancies
 */
export const analyzeExpenseAccountDiscrepancies = async (companyId) => {
  try {
    const expenses = await getCompanyExpenses(companyId);
    const financialAccounts = await getCompanyFinancialAccounts(companyId);
    
    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const paidExpenses = expenses
      .filter(e => (e.paymentStatus || '').toLowerCase() === 'paid')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    
    const paidExpensesWithoutAccount = expenses.filter(expense => {
      const paymentStatus = (expense.paymentStatus || '').toLowerCase();
      const financialAccountId = expense.financialAccountId || '';
      return paymentStatus === 'paid' && !financialAccountId;
    });
    
    const paidWithoutAccountTotal = paidExpensesWithoutAccount.reduce(
      (sum, e) => sum + parseFloat(e.amount || 0), 0
    );
    
    // Analyze each financial account
    const accountAnalysis = financialAccounts.map(account => {
      const accountExpenses = expenses.filter(e => 
        e.financialAccountId === account.id && 
        (e.paymentStatus || '').toLowerCase() === 'paid'
      );
      
      const expectedBalance = accountExpenses.reduce(
        (sum, e) => sum - parseFloat(e.amount || 0), // Negative for expenses
        0
      );
      
      const actualBalance = parseFloat(account.currentBalance || 0);
      const discrepancy = Math.abs(expectedBalance - actualBalance);
      
      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currentBalance: actualBalance,
        expectedBalance,
        discrepancy,
        expenseCount: accountExpenses.length,
        totalExpenses: accountExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
      };
    });
    
    const issuesFound = accountAnalysis.filter(a => a.discrepancy > 0.01).length;
    
    return {
      totalExpenses,
      paidExpenses,
      paidExpensesWithoutAccount: paidExpensesWithoutAccount.length,
      paidWithoutAccountTotal,
      issuesFound,
      accounts: accountAnalysis
    };
  } catch (error) {
    console.error('Error analyzing expense account discrepancies:', error);
    throw error;
  }
};

/**
 * Get repair recommendations based on analysis
 */
export const getRepairRecommendations = async (companyId) => {
  try {
    const analysis = await analyzeExpenseAccountDiscrepancies(companyId);
    const expenses = await getCompanyExpenses(companyId); // Fetch expenses here
    const recommendations = [];
    
    if (analysis.paidExpensesWithoutAccount > 0) {
      recommendations.push({
        action: 'repairPaidExpensesWithoutAccount',
        title: 'Repair Paid Expenses Without Account',
        description: `${analysis.paidExpensesWithoutAccount} paid expense(s) are missing a financial account link. These expenses won't affect account balances.`,
        count: analysis.paidExpensesWithoutAccount,
        totalAmount: analysis.paidWithoutAccountTotal,
        affectedCount: analysis.paidExpensesWithoutAccount
      });
    }
    
    // Check if we need to rebuild ledger entries
    // This happens when expenses have financialAccountId but ledger entries don't
    const expensesWithAccount = expenses.filter(e => 
      (e.paymentStatus || '').toLowerCase() === 'paid' && 
      e.financialAccountId
    );
    
    if (expensesWithAccount.length > 0) {
      recommendations.push({
        action: 'rebuildAllLedgerEntries',
        title: 'Rebuild Ledger Entries',
        description: `Rebuild ledger entries for ${expensesWithAccount.length} paid expense(s) with financial accounts. This ensures ledger entries have financialAccountId set correctly.`,
        count: expensesWithAccount.length,
        affectedCount: expensesWithAccount.length,
        priority: 'high'
      });
    }
    
    if (analysis.issuesFound > 0) {
      recommendations.push({
        action: 'recalculateAccountBalances',
        title: 'Recalculate Account Balances',
        description: `${analysis.issuesFound} account(s) have balance discrepancies. Recalculate all financial account balances from ledger entries to ensure accuracy. This should be done AFTER rebuilding ledger entries.`,
        count: analysis.issuesFound,
        affectedCount: analysis.issuesFound
      });
    }
    
    return {
      analysis,
      recommendations
    };
  } catch (error) {
    console.error('Error getting repair recommendations:', error);
    throw error;
  }
};

/**
 * Repair expenses by adding missing financialAccountId to paid expenses
 */
export const repairPaidExpensesWithoutAccount = async (
  companyId, 
  defaultAccountId,
  options = {}
) => {
  const {
    dryRun = false,
    limit = null,
    onProgress = null
  } = options;

  try {
    const expenses = await getCompanyExpenses(companyId);
    const financialAccounts = await getCompanyFinancialAccounts(companyId);
    
    // Find default account
    const defaultAccount = financialAccounts.find(acc => acc.id === defaultAccountId);
    if (!defaultAccount) {
      throw new Error(`Default account ${defaultAccountId} not found`);
    }

    // Find paid expenses without financialAccountId
    const paidExpensesWithoutAccount = expenses.filter(expense => {
      const paymentStatus = (expense.paymentStatus || '').toLowerCase();
      const financialAccountId = expense.financialAccountId || '';
      return paymentStatus === 'paid' && !financialAccountId;
    });

    if (limit) {
      paidExpensesWithoutAccount.splice(limit);
    }

    const results = {
      total: paidExpensesWithoutAccount.length,
      processed: 0,
      updated: 0,
      errors: []
    };

    if (dryRun) {
      console.log(`[DRY RUN] Would update ${results.total} expenses`);
      return {
        ...results,
        expenses: paidExpensesWithoutAccount.map(e => ({
          id: e.id,
          vendor: e.vendor,
          amount: e.amount,
          date: e.date
        }))
      };
    }

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < paidExpensesWithoutAccount.length; i += batchSize) {
      const batch = paidExpensesWithoutAccount.slice(i, i + batchSize);
      
      for (const expense of batch) {
        try {
          // Update expense with financialAccountId AND paymentStatus='paid' to ensure ledger entry is created
          const updateData = {
            financialAccountId: defaultAccountId,
            paymentStatus: 'paid', // Ensure it's marked as paid
            updatedBy: 'system-repair',
            updatedAt: new Date().toISOString()
          };
          
          // If expense doesn't have a paidDate, set it
          if (!expense.paidDate && expense.date) {
            updateData.paidDate = expense.date;
          } else if (!expense.paidDate) {
            updateData.paidDate = new Date().toISOString().split('T')[0];
          }
          
          await updateCompanyExpense(companyId, expense.id, updateData);
          
          results.updated += 1;
        } catch (error) {
          results.errors.push({
            expenseId: expense.id,
            error: error.message
          });
        }
        
        results.processed += 1;
        
        if (onProgress) {
          onProgress({
            processed: results.processed,
            total: results.total,
            updated: results.updated,
            errors: results.errors.length
          });
        }
      }
      
      // Small delay between batches to allow Firestore to process
      if (i + batchSize < paidExpensesWithoutAccount.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  } catch (error) {
    console.error('Error repairing paid expenses:', error);
    throw error;
  }
};

/**
 * Merge "Subscription" category into "Subscriptions" for all expenses
 */
export const mergeSubscriptionCategories = async (companyId, options = {}) => {
  const {
    dryRun = false,
    onProgress = null
  } = options;

  try {
    const expenses = await getCompanyExpenses(companyId);
    
    // Find expenses with "Subscription" (singular) category
    const expensesToFix = expenses.filter(expense => {
      const category = (expense.category || '').trim();
      return category === 'Subscription';
    });

    const results = {
      total: expensesToFix.length,
      processed: 0,
      updated: 0,
      errors: []
    };

    if (dryRun) {
      console.log(`[DRY RUN] Would update ${results.total} expenses`);
      return results;
    }

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < expensesToFix.length; i += batchSize) {
      const batch = expensesToFix.slice(i, i + batchSize);
      
      for (const expense of batch) {
        try {
          await updateCompanyExpense(companyId, expense.id, {
            category: 'Subscriptions',
            updatedBy: 'system-repair',
            updatedAt: new Date().toISOString()
          });
          
          results.updated += 1;
        } catch (error) {
          results.errors.push({
            expenseId: expense.id,
            error: error.message
          });
        }
        
        results.processed += 1;
        
        if (onProgress) {
          onProgress({
            processed: results.processed,
            total: results.total,
            updated: results.updated,
            errors: results.errors.length
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error merging subscription categories:', error);
    throw error;
  }
};

/**
 * Recalculate all financial account balances from ledger entries
 * This is the authoritative source of truth for account balances
 */
export const recalculateAccountBalances = async (
  companyId,
  options = {}
) => {
  const {
    dryRun = false,
    onProgress = null
  } = options;

  try {
    const financialAccounts = await getCompanyFinancialAccounts(companyId);
    const ledgerEntriesRef = collection(db, 'companies', companyId, 'ledgerEntries');
    
    // Get ALL ledger entries (we'll filter reversals in memory)
    const snapshot = await getDocs(ledgerEntriesRef);
    
    console.log(`[Recalculate] Found ${snapshot.size} total ledger entries`);
    
    // Calculate balances for each financial account from ALL ledger entries
    const accountBalances = new Map();
    const accountDetails = new Map(); // Track details for debugging
    let entriesWithFinancialAccount = 0;
    let entriesWithoutFinancialAccount = 0;
    
    snapshot.forEach((docSnap) => {
      const entry = docSnap.data();
      
      // Skip reversal entries
      if (entry.isReversal === true) {
        return;
      }
      
      const lines = entry.lines || [];
      let entryHasFinancialAccount = false;
      
      lines.forEach((line) => {
        const financialAccountId = line.financialAccountId;
        if (!financialAccountId) {
          entryHasFinancialAccount = false;
          return;
        }
        
        entryHasFinancialAccount = true;
        const debit = parseFloat(line.debit || 0);
        const credit = parseFloat(line.credit || 0);
        const delta = debit - credit;
        
        if (!accountBalances.has(financialAccountId)) {
          accountBalances.set(financialAccountId, 0);
          accountDetails.set(financialAccountId, {
            entries: [],
            totalDebit: 0,
            totalCredit: 0
          });
        }
        
        const currentBalance = accountBalances.get(financialAccountId);
        accountBalances.set(financialAccountId, currentBalance + delta);
        
        const details = accountDetails.get(financialAccountId);
        details.entries.push({
          entryId: docSnap.id,
          date: entry.date,
          description: entry.description,
          sourceId: entry.sourceId,
          sourceType: entry.sourceType,
          debit,
          credit,
          delta
        });
        details.totalDebit += debit;
        details.totalCredit += credit;
      });
      
      if (entryHasFinancialAccount) {
        entriesWithFinancialAccount++;
      } else {
        entriesWithoutFinancialAccount++;
      }
    });
    
    console.log(`[Recalculate] Ledger entries with financialAccountId: ${entriesWithFinancialAccount}`);
    console.log(`[Recalculate] Ledger entries without financialAccountId: ${entriesWithoutFinancialAccount}`);
    console.log(`[Recalculate] Accounts found in ledger:`, Array.from(accountBalances.keys()));
    
    const results = {
      total: financialAccounts.length,
      processed: 0,
      updated: 0,
      errors: [],
      balances: {},
      debug: {} // Add debug info
    };
    
    if (dryRun) {
      console.log('[DRY RUN] Would update account balances:');
      accountBalances.forEach((balance, accountId) => {
        const account = financialAccounts.find(a => a.id === accountId);
        const details = accountDetails.get(accountId);
        console.log(`  ${account?.name || accountId}: ${balance.toFixed(2)}`);
        console.log(`    Entries: ${details?.entries.length || 0}, Debit: ${details?.totalDebit.toFixed(2) || 0}, Credit: ${details?.totalCredit.toFixed(2) || 0}`);
      });
      return {
        ...results,
        balances: Object.fromEntries(accountBalances),
        debug: Object.fromEntries(accountDetails),
        summary: {
          totalLedgerEntries: snapshot.size,
          entriesWithFinancialAccount: entriesWithFinancialAccount,
          entriesWithoutFinancialAccount: entriesWithoutFinancialAccount,
          accountsInLedger: Array.from(accountBalances.keys()).length
        }
      };
    }
    
    // Update each financial account balance
    for (const account of financialAccounts) {
      try {
        const calculatedBalance = accountBalances.get(account.id) || 0;
        const currentBalance = parseFloat(account.currentBalance || 0);
        
        // Store debug info
        const details = accountDetails.get(account.id) || { entries: [], totalDebit: 0, totalCredit: 0 };
        results.debug[account.id] = {
          accountName: account.name,
          currentBalance,
          calculatedBalance,
          entryCount: details.entries.length,
          totalDebit: details.totalDebit,
          totalCredit: details.totalCredit
        };
        
        // Only update if there's a difference
        if (Math.abs(calculatedBalance - currentBalance) > 0.01) {
          try {
            const accountRef = doc(db, 'companies', companyId, 'financialAccounts', account.id);
            
            // Log what we're trying to update
            console.log(`[Recalculate] Updating account ${account.name}:`, {
              accountId: account.id,
              currentBalance,
              calculatedBalance,
              difference: calculatedBalance - currentBalance,
              entryCount: details.entries.length
            });
            
            await updateDoc(accountRef, {
              currentBalance: parseFloat(calculatedBalance.toFixed(2)),
              updatedAt: serverTimestamp()
            });
            
            results.balances[account.id] = {
              name: account.name,
              oldBalance: currentBalance,
              newBalance: calculatedBalance,
              difference: calculatedBalance - currentBalance
            };
            
            results.updated += 1;
          } catch (updateError) {
            console.error(`[Recalculate] Failed to update account ${account.name}:`, updateError);
            throw new Error(`Failed to update ${account.name}: ${updateError.message}`);
          }
        } else {
          // Log accounts that don't need updating
          console.log(`[Recalculate] Account ${account.name} balance is correct:`, {
            accountId: account.id,
            currentBalance,
            calculatedBalance,
            entryCount: details.entries.length
          });
        }
        
        results.processed += 1;
        
        if (onProgress) {
          onProgress({
            processed: results.processed,
            total: results.total,
            updated: results.updated,
            errors: results.errors.length
          });
        }
      } catch (error) {
        results.errors.push({
          accountId: account.id,
          accountName: account.name,
          error: error.message
        });
        results.processed += 1;
      }
    }
    
    // Add summary to results
    results.summary = {
      totalLedgerEntries: snapshot.size,
      entriesWithFinancialAccount: entriesWithFinancialAccount,
      entriesWithoutFinancialAccount: entriesWithoutFinancialAccount,
      accountsInLedger: Array.from(accountBalances.keys()).length
    };
    
    return results;
  } catch (error) {
    console.error('Error recalculating account balances:', error);
    // Include debug info in error if available
    if (error.debug) {
      error.debug = error.debug;
    }
    throw error;
  }
};

/**
 * DIAGNOSTIC: Get detailed breakdown of expenses and ledger entries for a specific account
 * This helps debug why balances don't match
 */
export const diagnoseAccountBalance = async (companyId, accountId) => {
  try {
    const expenses = await getCompanyExpenses(companyId);
    const financialAccounts = await getCompanyFinancialAccounts(companyId);
    const account = financialAccounts.find(a => a.id === accountId);
    
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }
    
    // Get all expenses linked to this account
    const accountExpenses = expenses.filter(e => 
      e.financialAccountId === accountId && 
      (e.paymentStatus || '').toLowerCase() === 'paid'
    );
    
    const expectedFromExpenses = accountExpenses.reduce(
      (sum, e) => sum - parseFloat(e.amount || 0), // Negative for expenses
      0
    );
    
    // Get all ledger entries for this account
    const ledgerEntriesRef = collection(db, 'companies', companyId, 'ledgerEntries');
    const snapshot = await getDocs(ledgerEntriesRef);
    
    const ledgerEntries = [];
    let calculatedFromLedger = 0;
    
    snapshot.forEach((docSnap) => {
      const entry = docSnap.data();
      if (entry.isReversal === true) return;
      
      const lines = entry.lines || [];
      lines.forEach((line) => {
        if (line.financialAccountId === accountId) {
          const debit = parseFloat(line.debit || 0);
          const credit = parseFloat(line.credit || 0);
          const delta = debit - credit;
          calculatedFromLedger += delta;
          
          ledgerEntries.push({
            entryId: docSnap.id,
            date: entry.date,
            description: entry.description,
            sourceId: entry.sourceId,
            sourceType: entry.sourceType,
            debit,
            credit,
            delta,
            line: line
          });
        }
      });
    });
    
    // Sort by date
    ledgerEntries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    
    return {
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        currentBalance: parseFloat(account.currentBalance || 0)
      },
      expenses: {
        count: accountExpenses.length,
        total: accountExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
        expectedBalance: expectedFromExpenses,
        items: accountExpenses.map(e => ({
          id: e.id,
          date: e.date,
          vendor: e.vendor,
          amount: parseFloat(e.amount || 0),
          paymentStatus: e.paymentStatus,
          financialAccountId: e.financialAccountId,
          ledgerEntryId: e.ledgerEntryId
        }))
      },
      ledger: {
        entryCount: ledgerEntries.length,
        calculatedBalance: calculatedFromLedger,
        entries: ledgerEntries
      },
      discrepancies: {
        expenseVsLedger: Math.abs(expectedFromExpenses - calculatedFromLedger),
        ledgerVsAccount: Math.abs(calculatedFromLedger - parseFloat(account.currentBalance || 0)),
        expenseVsAccount: Math.abs(expectedFromExpenses - parseFloat(account.currentBalance || 0))
      }
    };
  } catch (error) {
    console.error('Error diagnosing account balance:', error);
    throw error;
  }
};

/**
 * Rebuild ledger entries for ALL paid expenses that have financialAccountId
 * This fixes the case where expenses have financialAccountId but ledger entries
 * don't have financialAccountId set on the credit line (or don't exist)
 */
export const rebuildAllLedgerEntries = async (
  companyId,
  options = {}
) => {
  const {
    dryRun = false,
    currentUserId = '',
    onProgress = null
  } = options;

  try {
    const expenses = await getCompanyExpenses(companyId);
    
    // Find ALL paid expenses with financialAccountId that need ledger rebuild
    const expensesToRebuild = expenses.filter(expense => {
      const paymentStatus = (expense.paymentStatus || '').toLowerCase();
      const financialAccountId = expense.financialAccountId || '';
      return paymentStatus === 'paid' && financialAccountId;
    });

    const results = {
      total: expensesToRebuild.length,
      processed: 0,
      updated: 0,
      errors: []
    };

    if (dryRun) {
      console.log(`[DRY RUN] Would rebuild ledger entries for ${results.total} expenses`);
      return results;
    }

    console.log(`[Rebuild Ledger] Found ${results.total} paid expenses with financialAccountId to rebuild`);

    // Process in batches - update each expense to trigger ledger rebuild
    const batchSize = 5; // Smaller batch size for ledger operations
    for (let i = 0; i < expensesToRebuild.length; i += batchSize) {
      const batch = expensesToRebuild.slice(i, i + batchSize);
      
      for (const expense of batch) {
        try {
          // Trigger ledger rebuild by updating a ledger-relevant field
          // The updateCompanyExpense function will detect this and rebuild the ledger entry
          // Use currentUserId if provided, otherwise fall back to expense creator
          const userIdForUpdate = currentUserId || expense.createdBy || '';
          if (!userIdForUpdate) {
            throw new Error('No user ID available for ledger entry creation');
          }
          
          await updateCompanyExpense(companyId, expense.id, {
            financialAccountId: expense.financialAccountId, // Keep existing
            paymentStatus: 'paid', // Ensure it's paid
            updatedBy: userIdForUpdate, // Use current authenticated user
            updatedAt: new Date().toISOString()
          });
          
          results.updated += 1;
        } catch (error) {
          console.error(`[Rebuild Ledger] Failed to rebuild expense ${expense.id}:`, error);
          results.errors.push({
            expenseId: expense.id,
            error: error.message
          });
        }
        
        results.processed += 1;
        
        if (onProgress) {
          onProgress({
            processed: results.processed,
            total: results.total,
            updated: results.updated,
            errors: results.errors.length
          });
        }
      }
      
      // Delay between batches to allow Firestore to process
      if (i + batchSize < expensesToRebuild.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Rebuild Ledger] Completed: ${results.updated} updated, ${results.errors.length} errors`);
    return results;
  } catch (error) {
    console.error('Error rebuilding ledger entries:', error);
    throw error;
  }
};
