/**
 * GDPR COMPLIANCE UTILITIES
 * 
 * Implements GDPR requirements:
 * - Article 15: Right of Access (data export)
 * - Article 17: Right to Erasure (account deletion)
 * - Article 20: Data Portability
 * 
 * Usage:
 * import { exportUserData, deleteUserData } from '@/utils/gdpr';
 */

import { collection, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import { db, storage } from '../firebase';

/**
 * Export all user data (GDPR Article 15 - Right of Access)
 * @param {string} userId - User ID
 * @returns {Promise<object>} - All user data in JSON format
 */
export async function exportUserData(userId) {
  try {
    const userData = {
      exportedAt: new Date().toISOString(),
      userId,
      userProfile: null,
      expenses: [],
      accounts: [],
      attachments: [],
      auditLogs: []
    };

    // Get user profile
    const userDoc = await getDocs(query(
      collection(db, 'users'),
      where('__name__', '==', userId)
    ));
    
    if (!userDoc.empty) {
      userData.userProfile = {
        id: userDoc.docs[0].id,
        ...userDoc.docs[0].data()
      };
    }

    // Get all expenses
    const expensesQuery = query(
      collection(db, 'users', userId, 'expenses')
    );
    const expensesSnapshot = await getDocs(expensesQuery);
    userData.expenses = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get all accounts
    const accountsQuery = query(
      collection(db, 'users', userId, 'accounts')
    );
    const accountsSnapshot = await getDocs(accountsQuery);
    userData.accounts = accountsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get file attachments list
    try {
      const userFilesRef = ref(storage, `users/${userId}`);
      const fileList = await listAll(userFilesRef);
      userData.attachments = fileList.items.map(item => ({
        path: item.fullPath,
        name: item.name
      }));
    } catch (error) {
      console.error('Error listing files:', error);
    }

    // Get audit logs (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    try {
      const auditQuery = query(
        collection(db, 'globalAuditLogs'),
        where('userId', '==', userId),
        where('timestamp', '>=', ninetyDaysAgo)
      );
      const auditSnapshot = await getDocs(auditQuery);
      userData.auditLogs = auditSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting audit logs:', error);
    }

    return userData;
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw new Error('Failed to export user data');
  }
}

/**
 * Delete all user data (GDPR Article 17 - Right to Erasure)
 * ⚠️ WARNING: This is irreversible!
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteUserData(userId) {
  try {
    // 1. Delete all expenses
    const expensesQuery = query(
      collection(db, 'users', userId, 'expenses')
    );
    const expensesSnapshot = await getDocs(expensesQuery);
    await Promise.all(
      expensesSnapshot.docs.map(docRef => deleteDoc(doc(db, 'users', userId, 'expenses', docRef.id)))
    );

    // 2. Delete all accounts
    const accountsQuery = query(
      collection(db, 'users', userId, 'accounts')
    );
    const accountsSnapshot = await getDocs(accountsQuery);
    await Promise.all(
      accountsSnapshot.docs.map(docRef => deleteDoc(doc(db, 'users', userId, 'accounts', docRef.id)))
    );

    // 3. Delete all files from storage
    try {
      const userFilesRef = ref(storage, `users/${userId}`);
      const fileList = await listAll(userFilesRef);
      
      // Delete all files recursively
      for (const item of fileList.items) {
        try {
          await deleteObject(item);
        } catch (error) {
          console.error(`Error deleting file ${item.name}:`, error);
        }
      }

      // Delete all prefixes (folders)
      for (const prefix of fileList.prefixes) {
        const prefixRef = ref(storage, prefix.fullPath);
        const prefixList = await listAll(prefixRef);
        for (const item of prefixList.items) {
          try {
            await deleteObject(item);
          } catch (error) {
            console.error(`Error deleting file ${item.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting files:', error);
    }

    // 4. Delete user profile (keep for audit trail, mark as deleted)
    // In production, you might want to soft-delete instead
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      deletedAt: new Date().toISOString(),
      email: `deleted_${userId}@deleted.local`,
      displayName: '[Deleted User]'
    });

    return true;
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw new Error('Failed to delete user data');
  }
}

/**
 * Download user data as JSON file
 * @param {string} userId - User ID
 */
export async function downloadUserData(userId) {
  try {
    const data = await exportUserData(userId);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biz-copilot-data-export-${userId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error downloading user data:', error);
    throw error;
  }
}

