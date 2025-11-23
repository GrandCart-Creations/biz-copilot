import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  analyzeExpenseAccountDiscrepancies, 
  getRepairRecommendations,
  repairPaidExpensesWithoutAccount,
  mergeSubscriptionCategories,
  recalculateAccountBalances,
  diagnoseAccountBalance,
  rebuildAllLedgerEntries
} from '../utils/repairAccountBalances';
import { getCompanyFinancialAccounts } from '../firebase';
import { FaExclamationTriangle, FaCheckCircle, FaSpinner, FaInfoCircle } from 'react-icons/fa';

const AccountBalanceRepair = () => {
  const { currentCompany } = useCompany();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [repairProgress, setRepairProgress] = useState(null);
  const [repairResults, setRepairResults] = useState(null);
  const [error, setError] = useState('');
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);

  useEffect(() => {
    if (currentCompany?.id) {
      loadFinancialAccounts();
    }
  }, [currentCompany]);

  const loadFinancialAccounts = async () => {
    try {
      const accounts = await getCompanyFinancialAccounts(currentCompany.id);
      setFinancialAccounts(accounts);
      
      // Auto-select ING MasterCard account if available
      const ingAccount = accounts.find(acc => 
        acc.name?.toLowerCase().includes('mastercard') || 
        acc.name?.toLowerCase().includes('ing')
      );
      if (ingAccount) {
        setSelectedAccountId(ingAccount.id);
      } else if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      }
    } catch (err) {
      console.error('Error loading financial accounts:', err);
      setError('Failed to load financial accounts');
    }
  };

  const handleAnalyze = async () => {
    if (!currentCompany?.id) {
      setError('Please select a company first');
      return;
    }

    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    setRecommendations([]);

    try {
      const result = await getRepairRecommendations(currentCompany.id);
      setAnalysis(result.analysis);
      setRecommendations(result.recommendations);
    } catch (err) {
      console.error('Error analyzing:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRepair = async (recommendation) => {
    if (!currentCompany?.id) {
      setError('Please select a company first');
      return;
    }

    if (recommendation.action === 'repairPaidExpensesWithoutAccount' && !selectedAccountId) {
      setError('Please select a financial account to use for repairs');
      return;
    }

    let confirmMessage = '';
    if (recommendation.action === 'rebuildAllLedgerEntries') {
      confirmMessage = `This will rebuild ledger entries for ${recommendation.affectedCount} expense(s). This may take a few minutes. Are you sure you want to proceed?`;
    } else if (recommendation.action === 'recalculateAccountBalances') {
      confirmMessage = `This will recalculate balances for ${recommendation.affectedCount} account(s). Are you sure you want to proceed?`;
    } else {
      confirmMessage = `This will update ${recommendation.affectedCount} expense(s). Are you sure you want to proceed?`;
    }
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setRepairing(true);
    setError('');
    setRepairResults(null);
    setRepairProgress({ processed: 0, total: 0, updated: 0, errors: 0 });

    try {
      let result;
      
      if (recommendation.action === 'repairPaidExpensesWithoutAccount') {
        result = await repairPaidExpensesWithoutAccount(
          currentCompany.id,
          selectedAccountId,
          {
            onProgress: (progress) => {
              setRepairProgress(progress);
            }
          }
        );
      } else if (recommendation.action === 'mergeSubscriptionCategories') {
        result = await mergeSubscriptionCategories(
          currentCompany.id,
          {
            onProgress: (progress) => {
              setRepairProgress(progress);
            }
          }
        );
      } else if (recommendation.action === 'recalculateAccountBalances') {
        result = await recalculateAccountBalances(
          currentCompany.id,
          {
            onProgress: (progress) => {
              setRepairProgress(progress);
            }
          }
        );
      } else if (recommendation.action === 'rebuildAllLedgerEntries') {
        result = await rebuildAllLedgerEntries(
          currentCompany.id,
          {
            currentUserId: currentUser?.uid || '',
            onProgress: (progress) => {
              setRepairProgress(progress);
            }
          }
        );
      } else {
        throw new Error(`Unknown repair action: ${recommendation.action}`);
      }

      setRepairResults(result);
      
      // Show success message
      if (result.updated > 0) {
        console.log('Repair successful:', result);
      }
      
      // If recalculation, show debug info
      if (recommendation.action === 'recalculateAccountBalances' && result.summary) {
        console.log('Recalculation summary:', result.summary);
        if (result.summary.entriesWithoutFinancialAccount > 0) {
          console.warn(`Warning: ${result.summary.entriesWithoutFinancialAccount} ledger entries don't have financialAccountId set. These won't affect account balances.`);
        }
      }
      
      // If we just rebuilt ledger entries, wait longer for them to be created
      if (recommendation.action === 'rebuildAllLedgerEntries') {
        // Wait 5 seconds for ledger entries to be created
        setTimeout(() => {
          handleAnalyze();
        }, 5000);
      } else if (recommendation.action === 'repairPaidExpensesWithoutAccount') {
        // Wait 3 seconds for ledger entries to be created
        setTimeout(() => {
          handleAnalyze();
        }, 3000);
      } else {
        // Re-analyze after repair
        setTimeout(() => {
          handleAnalyze();
        }, 1000);
      }
    } catch (err) {
      console.error('Error repairing:', err);
      let errorMessage = err.message || 'Unknown error';
      
      // Provide more helpful error messages
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        errorMessage = 'Missing or insufficient permissions. Please ensure you are logged in as a company owner.';
      } else if (errorMessage.includes('Missing or insufficient permissions')) {
        errorMessage = 'Missing or insufficient permissions. Please ensure you are logged in as a company owner.';
      }
      
      setError(`Repair failed: ${errorMessage}`);
      
      // If recalculation failed, show debug info if available
      if (recommendation.action === 'recalculateAccountBalances' && err.debug) {
        console.log('Recalculation debug info:', err.debug);
      }
    } finally {
      setRepairing(false);
      setRepairProgress(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Account Balance Repair Tool</h2>
            <p className="text-sm text-gray-600 mt-1">
              Identify and fix discrepancies between expenses and financial account balances
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Financial Account Selection */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Financial Account for Repairs
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={repairing}
          >
            <option value="">Select an account...</option>
            {financialAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({formatCurrency(account.currentBalance || 0)})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Paid expenses without a financial account will be linked to this account
          </p>
        </div>

        {/* Analyze Button */}
        <div className="mb-6">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !currentCompany?.id}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {analyzing ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <FaInfoCircle className="mr-2" />
                Analyze Account Discrepancies
              </>
            )}
          </button>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Analysis Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Total Expenses</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(analysis.totalExpenses)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Paid Expenses</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(analysis.paidExpenses)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Paid Without Account</div>
                  <div className="text-lg font-semibold text-red-600">
                    {analysis.paidExpensesWithoutAccount || 0}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Issues Found</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {analysis.issuesFound || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Breakdown */}
            {analysis.accounts && analysis.accounts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Account Breakdown</h3>
                <div className="space-y-3">
                  {analysis.accounts.map((account) => {
                    if (account.expenseCount === 0) return null;
                    return (
                      <div key={account.accountId} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700">{account.accountName}</span>
                          <span className="text-sm text-gray-500">
                            {account.expenseCount} expense(s)
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Expected Balance</div>
                            <div className="font-semibold">{formatCurrency(account.expectedBalance)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Actual Balance</div>
                            <div className="font-semibold">{formatCurrency(account.currentBalance)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Discrepancy</div>
                            <div className={`font-semibold ${account.discrepancy > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(account.discrepancy)}
                            </div>
                          </div>
                        </div>
                        {selectedAccountId === account.accountId && (
                          <button
                            onClick={async () => {
                              setDiagnosing(true);
                              try {
                                const diag = await diagnoseAccountBalance(currentCompany.id, account.accountId);
                                setDiagnosticData(diag);
                              } catch (err) {
                                setError(`Diagnostic failed: ${err.message}`);
                              } finally {
                                setDiagnosing(false);
                              }
                            }}
                            disabled={diagnosing}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            {diagnosing ? 'Diagnosing...' : '🔍 Detailed Diagnostic'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Diagnostic Data */}
            {diagnosticData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-3">🔍 Detailed Diagnostic: {diagnosticData.account.name}</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-semibold">From Expenses:</div>
                    <div>Count: {diagnosticData.expenses.count}, Total: {formatCurrency(diagnosticData.expenses.total)}</div>
                    <div>Expected Balance: {formatCurrency(diagnosticData.expenses.expectedBalance)}</div>
                  </div>
                  <div>
                    <div className="font-semibold">From Ledger Entries:</div>
                    <div>Entry Count: {diagnosticData.ledger.entryCount}</div>
                    <div>Calculated Balance: {formatCurrency(diagnosticData.ledger.calculatedBalance)}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Current Account Balance:</div>
                    <div>{formatCurrency(diagnosticData.account.currentBalance)}</div>
                  </div>
                  <div className="border-t border-yellow-300 pt-2">
                    <div className="font-semibold text-red-600">Discrepancies:</div>
                    <div>Expense vs Ledger: {formatCurrency(diagnosticData.discrepancies.expenseVsLedger)}</div>
                    <div>Ledger vs Account: {formatCurrency(diagnosticData.discrepancies.ledgerVsAccount)}</div>
                    <div>Expense vs Account: {formatCurrency(diagnosticData.discrepancies.expenseVsAccount)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Repair Recommendations</h3>
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      rec.priority === 'high'
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-blue-300 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          {rec.priority === 'high' && (
                            <FaExclamationTriangle className="text-orange-500 mr-2" />
                          )}
                          <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                        {rec.estimatedImpact && (
                          <p className="text-xs text-gray-600 italic">{rec.estimatedImpact}</p>
                        )}
                      </div>
                    </div>
                    {(rec.action === 'repairPaidExpensesWithoutAccount' || rec.action === 'mergeSubscriptionCategories' || rec.action === 'recalculateAccountBalances' || rec.action === 'rebuildAllLedgerEntries') && (
                      <button
                        onClick={() => handleRepair(rec)}
                        disabled={repairing || (rec.action === 'repairPaidExpensesWithoutAccount' && !selectedAccountId)}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {repairing ? (
                          <>
                            <FaSpinner className="animate-spin mr-2" />
                            Repairing...
                          </>
                        ) : (
                          <>
                            <FaCheckCircle className="mr-2" />
                            {rec.action === 'mergeSubscriptionCategories' 
                              ? `Merge ${rec.affectedCount} Expense(s)`
                              : rec.action === 'recalculateAccountBalances'
                              ? `Recalculate ${rec.affectedCount} Account(s)`
                              : rec.action === 'rebuildAllLedgerEntries'
                              ? `Rebuild ${rec.affectedCount} Ledger Entries`
                              : `Repair ${rec.affectedCount} Expense(s)`
                            }
                          </>
                        )}
                      </button>
                    )}
                    {repairProgress && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Progress: {repairProgress.processed} / {repairProgress.total}</span>
                          <span>{repairProgress.updated} updated, {repairProgress.errors} errors</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(repairProgress.processed / repairProgress.total) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Repair Results */}
            {repairResults && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <h3 className="font-semibold text-green-900">Repair Complete</h3>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>Processed: {repairResults.processed} {repairResults.balances ? 'account(s)' : 'expense(s)'}</p>
                  <p>Updated: {repairResults.updated} {repairResults.balances ? 'account(s)' : 'expense(s)'}</p>
                  {repairResults.errors && repairResults.errors.length > 0 && (
                    <p className="text-red-600">Errors: {repairResults.errors.length}</p>
                  )}
                  {repairResults.balances && Object.keys(repairResults.balances).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="font-semibold mb-2">Balance Updates:</p>
                      {Object.entries(repairResults.balances).map(([accountId, balanceInfo]) => (
                        <div key={accountId} className="text-xs mb-1">
                          <span className="font-medium">{balanceInfo.name}:</span>{' '}
                          {formatCurrency(balanceInfo.oldBalance)} → {formatCurrency(balanceInfo.newBalance)}
                          {' '}({balanceInfo.difference > 0 ? '+' : ''}{formatCurrency(balanceInfo.difference)})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountBalanceRepair;

