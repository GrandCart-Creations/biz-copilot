// src/contexts/CompanyContext.jsx
// Company Management Context for Multi-Company Support

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
  collectionGroup
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_AI_POLICIES } from '../utils/accessGateway';
import { getCompanyAIPolicies } from '../utils/companySettings';

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

/**
 * CompanyProvider - Manages company selection and company data
 * 
 * Features:
 * - Multi-company support (serial entrepreneurs)
 * - Auto-creates default company for existing users
 * - Company switching
 * - Role-based access per company
 */
export const CompanyProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiPolicies, setAIPolicies] = useState(DEFAULT_AI_POLICIES);

  // Load user's companies on mount
  useEffect(() => {
    if (currentUser) {
      loadUserCompanies();
    } else {
      setLoading(false);
      setCompanies([]);
      setCurrentCompany(null);
      setCurrentCompanyId(null);
      setAIPolicies(DEFAULT_AI_POLICIES);
    }
  }, [currentUser]);

  // Load current company data when company ID changes
  useEffect(() => {
    if (currentCompanyId && currentUser) {
      loadCompanyData(currentCompanyId);
    }
  }, [currentCompanyId, currentUser]);

  /**
   * Load all companies the user has access to
   * @param {boolean} skipSelectionUpdate - If true, don't update current company selection
   */
  const loadUserCompanies = async (skipSelectionUpdate = false) => {
    if (!currentUser) return;

    try {
      setLoading(true);

      let companiesList = [];

      // Approach 1: Query companies created by this user (efficient query)
      const createdByUserQuery = query(
        collection(db, 'companies'),
        where('createdBy', '==', currentUser.uid)
      );
      const createdSnapshot = await getDocs(createdByUserQuery);
      
      // Add companies created by user
      // Use a Set to track company IDs and prevent duplicates
      const companyIdsSet = new Set();
      
      for (const companyDoc of createdSnapshot.docs) {
        try {
          const companyData = companyDoc.data();
          const companyId = companyDoc.id;
          
          // Skip if already processed (duplicate prevention)
          if (companyIdsSet.has(companyId)) {
            console.warn(`[CompanyContext] Duplicate company ID detected: ${companyId}, skipping.`);
            continue;
          }
          companyIdsSet.add(companyId);
          
          // Check if user document exists (should exist, but verify)
          // Wrap in try-catch to handle permission errors gracefully
          let userDoc = null;
          try {
            const userRef = doc(db, 'companies', companyId, 'users', currentUser.uid);
            userDoc = await getDoc(userRef);
          } catch (userDocError) {
            // If we can't read user doc, but we're the creator, we're still owner
            if (userDocError.code === 'permission-denied') {
              console.warn(`[CompanyContext] Permission denied reading user doc for company ${companyId}, but user is creator - treating as owner.`);
              userDoc = null; // Will default to owner role
            } else {
              throw userDocError; // Re-throw other errors
            }
          }
          
          const userDocData = userDoc && userDoc.exists() ? userDoc.data() : null;
          companiesList.push({
            id: companyId,
            name: companyData.name || 'Unnamed Company',
            createdBy: companyData.createdBy,
            createdAt: companyData.createdAt,
            updatedAt: companyData.updatedAt,
            settings: companyData.settings || {},
            userRole: userDocData ? userDocData.role : 'owner',
            accessModules: userDocData ? (userDocData.accessModules || []) : ['expenses', 'income', 'marketing', 'forecasting', 'settings'],
            subscriptionTier: userDocData ? (userDocData.subscriptionTier || 'business') : 'business',
            joinedAt: userDocData ? (userDocData.joinedAt || null) : null // Track when user joined
          });
        } catch (error) {
          // Log but don't throw - continue processing other companies
          if (error.code === 'permission-denied') {
            console.warn(`[CompanyContext] Permission denied for company ${companyDoc.id}, skipping:`, error.message);
          } else {
            console.error(`[CompanyContext] Error processing company ${companyDoc.id}:`, error);
          }
        }
      }
      
      // Deduplicate by ID before continuing
      const uniqueByCreatedBy = Array.from(
        new Map(companiesList.map(comp => [comp.id, comp])).values()
      );
      companiesList = Array.from(uniqueByCreatedBy);

      // Approach 2: Find companies where user is a member (but not creator)
      // Since we can't query all companies efficiently, we'll use a different strategy:
      // Try to read companies that the user might be part of by checking stored company IDs
      // or by attempting to read companies one by one from known sources
      
      // Strategy: Check localStorage for previously accessed companies
      // Also check if user has any accepted invitations that would create user documents
      try {
        // Get stored company IDs from localStorage (user might have switched before)
        const storedCompanyId = localStorage.getItem(`currentCompany_${currentUser.uid}`);
        const allStoredCompanies = [];
        
        // Check all localStorage keys for company references
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('currentCompany_')) {
            const storedId = localStorage.getItem(key);
            if (storedId && !companyIdsSet.has(storedId)) {
              allStoredCompanies.push(storedId);
            }
          }
        }
        
        // Try to read these stored companies to see if user has access
        for (const storedCompanyId of allStoredCompanies) {
          if (companyIdsSet.has(storedCompanyId)) continue;
          
          try {
            // Try to read user document in this company
            const userRef = doc(db, 'companies', storedCompanyId, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              // User is a member! Try to read company document
              try {
                const companyRef = doc(db, 'companies', storedCompanyId);
                const companyDoc = await getDoc(companyRef);
                
                if (companyDoc.exists()) {
                  const companyData = companyDoc.data();
                  const userData = userDoc.data();
                  
                  companyIdsSet.add(storedCompanyId);
                  companiesList.push({
                    id: storedCompanyId,
                    name: companyData.name || 'Unnamed Company',
                    createdBy: companyData.createdBy,
                    createdAt: companyData.createdAt,
                    updatedAt: companyData.updatedAt,
                    settings: companyData.settings || {},
                    userRole: userData.role || 'employee',
                    accessModules: userData.accessModules || [],
                    subscriptionTier: userData.subscriptionTier || 'lite',
                    joinedAt: userData.joinedAt || null
                  });
                }
              } catch (companyError) {
                // Can't read company - skip
                if (companyError.code !== 'permission-denied') {
                  console.warn(`[CompanyContext] Error reading company ${storedCompanyId}:`, companyError);
                }
              }
            }
          } catch (userDocError) {
            // Can't read user doc - user not a member, skip
          }
        }
      } catch (error) {
        console.warn('[CompanyContext] Error discovering companies from stored IDs:', error);
      }

      // Final deduplication by ID (in case duplicates were added somehow)
      const finalUniqueCompanies = Array.from(
        new Map(companiesList.map(comp => [comp.id, comp])).values()
      );
      companiesList = Array.from(finalUniqueCompanies);
      
      // Debug logging
      console.log(`[CompanyContext] Loaded ${companiesList.length} unique companies for user ${currentUser.uid}`);
      if (companiesList.length > 10) {
        console.warn(`[CompanyContext] WARNING: User has ${companiesList.length} companies - this may indicate duplicate creation.`);
      }

      // Sort companies intelligently:
      // 1. Current company first (if set)
      // 2. Companies where user is a member (not creator) - prioritize these for new users
      // 3. Most recently joined companies first
      // 4. Companies created by user come last
      // 5. Then by name, then by ID
      const currentId = currentCompanyId;
      const userId = currentUser.uid;
      
      companiesList.sort((a, b) => {
        // Current company always first
        if (a.id === currentId) return -1;
        if (b.id === currentId) return 1;
        
        // Priority: Companies where user is a member (not creator)
        const aIsCreator = a.createdBy === userId;
        const bIsCreator = b.createdBy === userId;
        
        if (!aIsCreator && bIsCreator) return -1; // a is member-only, b is creator
        if (aIsCreator && !bIsCreator) return 1;  // a is creator, b is member-only
        
        // If both are same type, sort by most recent join date
        if (a.joinedAt && b.joinedAt) {
          const aDate = a.joinedAt?.toDate ? a.joinedAt.toDate() : new Date(a.joinedAt);
          const bDate = b.joinedAt?.toDate ? b.joinedAt.toDate() : new Date(b.joinedAt);
          const dateDiff = bDate - aDate; // Most recent first
          if (dateDiff !== 0) return dateDiff > 0 ? 1 : -1;
        } else if (a.joinedAt && !b.joinedAt) return -1;
        else if (!a.joinedAt && b.joinedAt) return 1;
        
        // Fallback: sort by name
        const nameCompare = (a.name || '').localeCompare(b.name || '');
        if (nameCompare !== 0) return nameCompare;
        
        // Final fallback: sort by ID
        return a.id.localeCompare(b.id);
      });

      // If no companies found, create default company for user
      if (companiesList.length === 0) {
        const defaultCompany = await createDefaultCompany();
        if (defaultCompany) {
          companiesList.push(defaultCompany);
        }
      }

      setCompanies(companiesList);

      // Only update current company selection if not explicitly skipped (e.g., during switchCompany)
      if (!skipSelectionUpdate) {
        // Intelligent company selection priority:
        // 1. If user has a stored preference, use it (if still valid)
        // 2. If user is a member of companies (not creator), prioritize those
        // 3. Otherwise, use first company in list (which is sorted by priority)
        const storedCompanyId = localStorage.getItem(`currentCompany_${currentUser.uid}`);
        const currentSelection = currentCompanyId || storedCompanyId;
        
        let companyToUse = null;
        
        // Check if stored/current selection is still valid
        if (currentSelection && companiesList.find(c => c.id === currentSelection)) {
          companyToUse = currentSelection;
        } else {
            // No valid stored selection - choose intelligently
          if (companiesList.length > 0) {
            // Prioritize companies where user is a member (not creator)
            // These are typically companies they were invited to
            const memberCompanies = companiesList.filter(c => c.createdBy !== userId);
            
            if (memberCompanies.length > 0) {
              // User is a member of at least one company - use the first one
              // (already sorted by most recent join date)
              companyToUse = memberCompanies[0].id;
              console.log(`[CompanyContext] User is member of company ${companyToUse} (${memberCompanies[0].name}) - selecting it`);
              
              // Clear any old localStorage that might have wrong company
              localStorage.removeItem(`currentCompany_${currentUser.uid}`);
            } else {
              // User only created companies, use first one
              companyToUse = companiesList[0].id;
              console.log(`[CompanyContext] User only has created companies - selecting first: ${companyToUse}`);
            }
          }
        }

        if (companyToUse) {
          // Only update if it's different to avoid unnecessary re-renders
          if (currentCompanyId !== companyToUse) {
            console.log(`[CompanyContext] Setting initial company: ${companyToUse}`);
            setCurrentCompanyId(companyToUse);
            localStorage.setItem(`currentCompany_${currentUser.uid}`, companyToUse);
          }
          // Ensure company data is loaded (but only if not already loaded)
          if (!currentCompany || currentCompany.id !== companyToUse) {
            await loadCompanyData(companyToUse);
          }
        }
      } else {
        // Even when skipping selection update, ensure the current company is in the list
        // and company data is loaded if needed
        if (currentCompanyId) {
          const companyExists = companiesList.find(c => c.id === currentCompanyId);
          if (!companyExists) {
            console.warn(`[CompanyContext] Current company ${currentCompanyId} not in companies list after switch`);
          } else if (!currentCompany || currentCompany.id !== currentCompanyId) {
            // Company exists but data not loaded, load it
            await loadCompanyData(currentCompanyId);
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading user companies:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // If permission error, try to at least load from localStorage
      if (error.code === 'permission-denied') {
        const storedCompanyId = localStorage.getItem(`currentCompany_${currentUser.uid}`);
        if (storedCompanyId) {
          try {
            // Try to load just that one company
            const companyRef = doc(db, 'companies', storedCompanyId);
            const companyDoc = await getDoc(companyRef);
            if (companyDoc.exists()) {
              const companyData = companyDoc.data();
              setCompanies([{
                id: companyDoc.id,
                ...companyData,
                userRole: 'owner'
              }]);
              setCurrentCompanyId(storedCompanyId);
            }
          } catch (singleError) {
            console.error('Error loading single company:', singleError);
          }
        }
      }
      
      setLoading(false);
      // If error occurs, try to create default company anyway
      try {
        const defaultCompany = await createDefaultCompany();
        if (defaultCompany) {
          setCompanies([defaultCompany]);
          setCurrentCompanyId(defaultCompany.id);
          localStorage.setItem(`currentCompany_${currentUser.uid}`, defaultCompany.id);
        }
      } catch (createError) {
        console.error('Error creating default company:', createError);
      }
    }
  };

  /**
   * Load specific company data and user role
   */
  const refreshAIPolicies = useCallback(async (companyIdOverride = null) => {
    const targetCompanyId = companyIdOverride || currentCompanyId;
    if (!targetCompanyId) {
      setAIPolicies(DEFAULT_AI_POLICIES);
      return DEFAULT_AI_POLICIES;
    }

    const policies = await getCompanyAIPolicies(targetCompanyId);
    setAIPolicies(policies);
    return policies;
  }, [currentCompanyId]);

  const loadCompanyData = async (companyId) => {
    if (!currentUser || !companyId) return;

    try {
      // Get company document
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        console.error('Company not found:', companyId);
        return;
      }

      const companyData = {
        id: companyDoc.id,
        ...companyDoc.data()
      };

      // Get user's role in this company
      const userRef = doc(db, 'companies', companyId, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role || 'employee');
        companyData.userRole = userData.role;
        companyData.accessModules = userData.accessModules || [];
        companyData.subscriptionTier = userData.subscriptionTier || 'lite';
      } else {
        // If user not in new structure, they're owner by default (migration)
        setUserRole('owner');
        companyData.userRole = 'owner';
        companyData.accessModules = ['expenses', 'income'];
        companyData.subscriptionTier = 'business';
      }

      setCurrentCompany(companyData);
      await refreshAIPolicies(companyId);
      setLoading(false);
    } catch (error) {
      console.error('Error loading company data:', error);
      setLoading(false);
    }
  };

  /**
   * Create default company for existing user (migration)
   */
  const createDefaultCompany = async () => {
    if (!currentUser) return null;

    try {
      const companyData = {
        name: 'My Business',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: {
          country: 'NL', // Default to Netherlands (BENELUX)
          currency: 'EUR',
          taxRules: {
            rates: [0, 9, 21],
            country: 'NL'
          }
        }
      };

      // Create company document
      const companyRef = doc(collection(db, 'companies'));
      await setDoc(companyRef, companyData);

      // Add user as owner
      const userRef = doc(db, 'companies', companyRef.id, 'users', currentUser.uid);
      await setDoc(userRef, {
        role: 'owner',
        accessModules: ['expenses', 'income', 'marketing', 'forecasting', 'settings'],
        subscriptionTier: 'business',
        joinedAt: serverTimestamp()
      });

      // Migrate existing expenses to new structure (if any) - ONLY for default company
      // This ensures existing user data goes to "My Business" only
      await migrateUserExpenses(companyRef.id);

      return {
        id: companyRef.id,
        ...companyData,
        userRole: 'owner',
        accessModules: ['expenses', 'income', 'marketing', 'forecasting', 'settings'],
        subscriptionTier: 'business'
      };
    } catch (error) {
      console.error('Error creating default company:', error);
      throw error;
    }
  };

  /**
   * Migrate existing user expenses to company structure
   */
  /**
   * Migrate expenses from legacy user structure to company structure
   */
  const migrateUserExpenses = async (companyId) => {
    if (!currentUser) return { success: false, message: 'User must be authenticated' };

    try {
      console.log(`[CompanyContext] Starting expense migration for company ${companyId}`);
      
      // Import functions dynamically to avoid circular dependency
      const firebaseModule = await import('../firebase');
      
      // Get expenses from legacy structure
      const oldExpenses = await firebaseModule.getUserExpenses(currentUser.uid);
      
      if (!oldExpenses || oldExpenses.length === 0) {
        console.log('[CompanyContext] No legacy expenses found to migrate');
        // Mark as migrated (no expenses to migrate)
        await setDoc(doc(db, 'companies', companyId, 'settings', 'migration'), {
          expensesMigrated: true,
          oldExpenseCount: 0,
          migratedAt: serverTimestamp(),
          migratedExpenseCount: 0
        });
        return { success: true, message: 'No expenses to migrate', migratedCount: 0 };
      }

      console.log(`[CompanyContext] Found ${oldExpenses.length} expenses to migrate`);

      // Check if already migrated
      const migrationRef = doc(db, 'companies', companyId, 'settings', 'migration');
      const migrationDoc = await getDoc(migrationRef);
      
      if (migrationDoc.exists() && migrationDoc.data().expensesMigrated === true) {
        // Verify that expenses actually exist in the company structure
        // If migration was marked complete but no expenses exist, allow re-migration
        try {
          const companyExpenses = await firebaseModule.getCompanyExpenses(companyId);
          if (companyExpenses && companyExpenses.length > 0) {
            console.log(`[CompanyContext] Expenses already migrated (${companyExpenses.length} expenses found)`);
            return { success: true, message: `Expenses already migrated (${companyExpenses.length} expenses found)`, migratedCount: 0 };
          } else {
            console.warn('[CompanyContext] Migration flag set but no expenses found - allowing re-migration');
            // Clear the migration flag to allow re-migration
            await setDoc(migrationRef, {
              expensesMigrated: false,
              oldExpenseCount: oldExpenses.length,
              reMigrationNeeded: true,
              reMigrationAt: serverTimestamp()
            }, { merge: true });
            // Continue with migration below
          }
        } catch (verifyError) {
          console.warn('[CompanyContext] Could not verify migrated expenses, allowing re-migration:', verifyError);
          // Clear migration flag and continue
          await setDoc(migrationRef, {
            expensesMigrated: false,
            oldExpenseCount: oldExpenses.length,
            reMigrationNeeded: true,
            reMigrationAt: serverTimestamp()
          }, { merge: true });
          // Continue with migration below
        }
      }
      
      // If we get here, migration is needed or was incomplete

      // Migrate expenses to company structure
      let migratedCount = 0;
      let errorCount = 0;
      
      for (const expense of oldExpenses) {
        try {
          // Prepare expense data for company structure
          const { id: oldExpenseId, _decryptionError, ...expenseData } = expense;
          
          // Clean up any encrypted field artifacts from decryption
          const cleanedData = { ...expenseData };
          
          // Remove any _encrypted fields if they exist (will be re-encrypted by addCompanyExpense)
          Object.keys(cleanedData).forEach(key => {
            if (key.endsWith('_encrypted')) {
              delete cleanedData[key];
            }
          });
          
          // Ensure required fields exist with defaults if missing
          const migrationData = {
            date: cleanedData.date || new Date().toISOString().split('T')[0],
            category: cleanedData.category || 'Other',
            vendor: cleanedData.vendor || 'Unknown',
            invoiceNumber: cleanedData.invoiceNumber || '',
            description: cleanedData.description || '',
            amount: typeof cleanedData.amount === 'string' ? parseFloat(cleanedData.amount) : (cleanedData.amount || 0),
            vatNumber: cleanedData.vatNumber || '',
            bankAccount: cleanedData.bankAccount || '',
            paymentMethod: cleanedData.paymentMethod || 'Other',
            btw: cleanedData.btw !== undefined ? cleanedData.btw : 21,
            notes: cleanedData.notes || '',
            accountId: cleanedData.accountId || null,
            // Preserve original fields that might be useful
            ...(cleanedData.chamberOfCommerceNumber && { chamberOfCommerceNumber: cleanedData.chamberOfCommerceNumber }),
            // Migration metadata
            migratedFrom: `users/${currentUser.uid}/expenses/${oldExpenseId}`,
            originalExpenseId: oldExpenseId
          };
          
          // Add to company expenses (will encrypt sensitive fields)
          await firebaseModule.addCompanyExpense(companyId, currentUser.uid, migrationData);
          
          migratedCount++;
          console.log(`[CompanyContext] Migrated expense ${oldExpenseId} (${migratedCount}/${oldExpenses.length})`);
        } catch (expenseError) {
          console.error(`[CompanyContext] Error migrating expense ${expense.id || oldExpenseId}:`, expenseError);
          console.error(`[CompanyContext] Expense data that failed:`, expense);
          console.error(`[CompanyContext] Migration data that was attempted:`, migrationData);
          console.error(`[CompanyContext] Company ID: ${companyId}, User ID: ${currentUser.uid}`);
          console.error(`[CompanyContext] Error code: ${expenseError.code}, Error message: ${expenseError.message}`);
          errorCount++;
        }
      }

      // Update migration flag
      await setDoc(migrationRef, {
        expensesMigrated: true,
        oldExpenseCount: oldExpenses.length,
        migratedExpenseCount: migratedCount,
        errorCount: errorCount,
        migratedAt: serverTimestamp()
      });

      console.log(`[CompanyContext] Migration complete: ${migratedCount} expenses migrated, ${errorCount} errors`);
      
      return {
        success: migratedCount > 0,
        message: `Migrated ${migratedCount} expenses${errorCount > 0 ? ` (${errorCount} errors)` : ''}`,
        migratedCount,
        errorCount,
        totalCount: oldExpenses.length
      };
    } catch (error) {
      console.error('[CompanyContext] Error during expense migration:', error);
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        error: error.message
      };
    }
  };

  /**
   * Manually trigger expense migration for a company
   */
  const performExpenseMigration = async (companyId) => {
    if (!currentUser) throw new Error('User must be authenticated');
    if (!companyId) throw new Error('Company ID is required');
    
    return await migrateUserExpenses(companyId);
  };

  /**
   * Switch to a different company
   */
  const switchCompany = async (companyId) => {
    if (!currentUser) return;

    console.log(`[CompanyContext] Switching to company: ${companyId}`);

    // Verify company exists and user has access
    const companyDocRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyDocRef);
    
    if (!companyDoc.exists()) {
      console.error('Company not found:', companyId);
      await loadUserCompanies(); // Reload to refresh list
      return;
    }

    // Verify user has access to this company
    // User has access if:
    // 1. They are the creator (even if user doc doesn't exist yet), OR
    // 2. They have a user document in the company's users subcollection
    const companyData = companyDoc.data();
    const isCreator = companyData.createdBy === currentUser.uid;
    
    const userRef = doc(db, 'companies', companyId, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    const hasUserDoc = userDoc.exists();
    
    if (!isCreator && !hasUserDoc) {
      console.error('User does not have access to company:', companyId, {
        isCreator,
        hasUserDoc,
        companyCreatedBy: companyData.createdBy,
        currentUser: currentUser.uid
      });
      await loadUserCompanies(); // Reload to refresh list
      return;
    }
    
    // If user is creator but user doc doesn't exist, create it (for consistency)
    if (isCreator && !hasUserDoc) {
      console.log(`[CompanyContext] Creator accessing company ${companyId} without user doc - creating it`);
      try {
        await setDoc(userRef, {
          role: 'owner',
          accessModules: ['expenses', 'income', 'marketing', 'forecasting', 'settings'],
          subscriptionTier: 'business',
          joinedAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('Could not create user doc (may be permission issue):', error);
        // Continue anyway - user is creator so has access
      }
    }

    // Save to localStorage first to persist the selection
    localStorage.setItem(`currentCompany_${currentUser.uid}`, companyId);
    
    // Set current company state
    setCurrentCompanyId(companyId);
    
    // Load company data (this will trigger the useEffect to load data)
    await loadCompanyData(companyId);
    
    // Refresh companies list WITHOUT changing the current selection
    // Pass skipSelectionUpdate=true to prevent overriding the switch
    await loadUserCompanies(true);
    
    console.log(`[CompanyContext] Successfully switched to company: ${companyId}`);
  };

  /**
   * Update company name
   */
  const updateCompanyName = async (companyId, newName) => {
    if (!currentUser) throw new Error('User must be authenticated');
    if (!companyId || !newName || !newName.trim()) {
      throw new Error('Company ID and name are required');
    }

    try {
      const companyRef = doc(db, 'companies', companyId);
      
      // Verify company exists and user has access
      const companyDoc = await getDoc(companyRef);
      if (!companyDoc.exists()) {
        throw new Error('Company not found');
      }
      
      const companyData = companyDoc.data();
      
      // Verify user is creator or owner
      if (companyData.createdBy !== currentUser.uid) {
        // Check if user is owner via user document
        const userRef = doc(db, 'companies', companyId, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists() || userDoc.data().role !== 'owner') {
          throw new Error('You do not have permission to update this company');
        }
      }
      
      // Update the company name
      await updateDoc(companyRef, {
        name: newName.trim(),
        updatedAt: serverTimestamp()
      });

      // Update local state immediately for better UX
      if (currentCompany && currentCompany.id === companyId) {
        setCurrentCompany({
          ...currentCompany,
          name: newName.trim()
        });
      }

      // Update companies list locally
      setCompanies(prevCompanies => 
        prevCompanies.map(comp => 
          comp.id === companyId ? { ...comp, name: newName.trim() } : comp
        )
      );

      // Reload company data to ensure everything is in sync
      try {
        await loadCompanyData(companyId);
        await loadUserCompanies(); // Refresh companies list from Firestore
      } catch (reloadError) {
        console.error('Error reloading company data after update:', reloadError);
        // Don't throw - we've already updated local state
      }
    } catch (error) {
      console.error('Error updating company name:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        companyId: companyId,
        userId: currentUser.uid
      });
      throw error;
    }
  };

  /**
   * Delete a company and all its data
   */
  const deleteCompany = async (companyId) => {
    if (!currentUser) throw new Error('User must be authenticated');
    if (!companyId) throw new Error('Company ID is required');

    try {
      console.log(`[CompanyContext] Attempting to delete company: ${companyId}`);
      
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        throw new Error('Company not found');
      }

      const companyData = companyDoc.data();
      
      // Verify user is creator or owner
      // Prioritize checking if user is creator (doesn't require user doc read)
      const isCreator = companyData.createdBy === currentUser.uid;
      let isOwner = false;
      
      // Only check owner role if not creator (to avoid unnecessary permission checks)
      if (!isCreator) {
        try {
          const userRef = doc(db, 'companies', companyId, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          isOwner = userDoc.exists() && userDoc.data().role === 'owner';
        } catch (ownerCheckError) {
          // If we can't check owner role due to permissions, and user is not creator, deny
          if (ownerCheckError.code === 'permission-denied') {
            console.warn(`[CompanyContext] Cannot verify owner role for company ${companyId}, but user is not creator.`);
          }
        }
      }

      if (!isCreator && !isOwner) {
        throw new Error('You do not have permission to delete this company');
      }
      
      console.log(`[CompanyContext] User ${currentUser.uid} authorized to delete company ${companyId} (creator: ${isCreator}, owner: ${isOwner})`);

      // Use batch to delete all subcollections and the main document
      const batch = writeBatch(db);

      // Delete users subcollection
      try {
        const usersSnapshot = await getDocs(collection(companyRef, 'users'));
        usersSnapshot.docs.forEach(userDoc => {
          batch.delete(userDoc.ref);
        });
        console.log(`[CompanyContext] Queued ${usersSnapshot.docs.length} user documents for deletion`);
      } catch (error) {
        console.warn(`[CompanyContext] Error reading users subcollection:`, error);
      }

      // Delete expenses subcollection
      try {
        const expensesSnapshot = await getDocs(collection(companyRef, 'expenses'));
        expensesSnapshot.docs.forEach(expenseDoc => {
          batch.delete(expenseDoc.ref);
        });
        console.log(`[CompanyContext] Queued ${expensesSnapshot.docs.length} expense documents for deletion`);
      } catch (error) {
        console.warn(`[CompanyContext] Error reading expenses subcollection:`, error);
      }

      // Delete settings subcollection
      try {
        const settingsSnapshot = await getDocs(collection(companyRef, 'settings'));
        settingsSnapshot.docs.forEach(settingDoc => {
          batch.delete(settingDoc.ref);
        });
        console.log(`[CompanyContext] Queued ${settingsSnapshot.docs.length} setting documents for deletion`);
      } catch (error) {
        console.warn(`[CompanyContext] Error reading settings subcollection:`, error);
      }

      // Delete the main company document
      batch.delete(companyRef);

      // Commit the batch
      await batch.commit();
      console.log(`[CompanyContext] Successfully deleted company ${companyId} and all subcollections`);

      // Update local state
      setCompanies(prevCompanies => prevCompanies.filter(comp => comp.id !== companyId));

      // If the deleted company was the current one, switch to another or create default
      if (currentCompanyId === companyId) {
        const remainingCompanies = companies.filter(comp => comp.id !== companyId);
        if (remainingCompanies.length > 0) {
          await switchCompany(remainingCompanies[0].id);
        } else {
          setCurrentCompanyId(null);
          setCurrentCompany(null);
          localStorage.removeItem(`currentCompany_${currentUser.uid}`);
          // Create a new default company if none left
          await createDefaultCompany();
        }
      }

      // Reload companies list
      await loadUserCompanies();
    } catch (error) {
      console.error(`[CompanyContext] Error deleting company ${companyId}:`, error);
      throw error;
    }
  };

  /**
   * Create a new company
   * Note: Only owners can create additional companies.
   * Users without any company can create their first company (they become owner).
   */
  const createCompany = async (companyName, settings = {}) => {
    if (!currentUser) throw new Error('User must be authenticated');

    // Security check: If user already has a company, they must be an owner to create more
    if (currentCompany) {
      // User already has at least one company
      if (userRole !== 'owner') {
        throw new Error('Only owners can create additional companies. Please contact your company owner to create a new company.');
      }
    }
    // If no company exists yet, allow creation (user will become owner of first company)

    try {
      const companyData = {
        name: companyName,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: {
          country: settings.country || 'NL',
          currency: settings.currency || 'EUR',
          taxRules: settings.taxRules || {
            rates: [0, 9, 21],
            country: 'NL'
          },
          ...settings
        }
      };

      const companyRef = doc(collection(db, 'companies'));
      await setDoc(companyRef, companyData);

      // Add user as owner
      const userRef = doc(db, 'companies', companyRef.id, 'users', currentUser.uid);
      await setDoc(userRef, {
        role: 'owner',
        accessModules: ['expenses', 'income', 'marketing', 'forecasting', 'settings'],
        subscriptionTier: 'business',
        joinedAt: serverTimestamp()
      });

      // NOTE: Do NOT migrate expenses for new companies - they start clean
      // Migration only happens for the default "My Business" company

      // Verify the user document was created before proceeding
      // Try multiple times with a small delay to account for Firestore propagation
      let verifyUserDoc = await getDoc(userRef);
      let retries = 0;
      while (!verifyUserDoc.exists() && retries < 3) {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        verifyUserDoc = await getDoc(userRef);
        retries++;
      }
      
      if (!verifyUserDoc.exists()) {
        console.warn('User document not immediately available, but company was created:', companyRef.id);
        // Continue anyway - the document will be available soon
      }

      // Set as current company immediately for better UX
      const newCompanyId = companyRef.id;
      setCurrentCompanyId(newCompanyId);
      localStorage.setItem(`currentCompany_${currentUser.uid}`, newCompanyId);

      // Add to local state immediately so it shows up right away
      const newCompanyData = {
        id: newCompanyId,
        name: companyName,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: companyData.settings,
        userRole: 'owner',
        accessModules: ['expenses', 'income', 'marketing', 'forecasting', 'settings'],
        subscriptionTier: 'business'
      };
      
      // Update companies list locally first
      setCompanies(prev => [...prev, newCompanyData]);
      
      // Then load from Firestore to ensure we have the latest data
      try {
        await loadCompanyData(newCompanyId);
        await loadUserCompanies();
      } catch (error) {
        console.error('Error loading company data after creation:', error);
        // Continue anyway - we have the company in local state
      }

      return newCompanyId;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  };

  const value = {
    // State
    currentCompanyId,
    currentCompany,
    companies,
    userRole,
    aiPolicies,
    subscriptionTier: currentCompany?.subscriptionTier || 'business',
    loading,

    // Actions
    switchCompany,
    createCompany,
    updateCompanyName,
    deleteCompany,
    loadUserCompanies,
    refreshCompany: () => loadCompanyData(currentCompanyId),
    refreshAIPolicies,
    performExpenseMigration
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export default CompanyContext;

