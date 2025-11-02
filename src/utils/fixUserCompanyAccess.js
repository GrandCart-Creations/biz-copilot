/**
 * FIX USER COMPANY ACCESS
 * 
 * Utility to fix issues where a user was added with wrong UID
 * or needs to be re-associated with correct company
 */

import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Fix a user's company access by removing wrong UID and ensuring correct one exists
 * @param {string} companyId - Company ID
 * @param {string} email - User email
 * @param {string} correctUid - Correct Firebase Auth UID
 * @param {string} role - User role (default: 'employee')
 * @returns {Promise<{removed: string[], created: boolean}>}
 */
export const fixUserCompanyAccess = async (companyId, email, correctUid, role = 'employee') => {
  try {
    const usersRef = collection(db, 'companies', companyId, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const removed = [];
    let correctExists = false;
    const emailToCheck = email.toLowerCase().trim();
    
    // Find all entries for this email
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = (userData.email || '').toLowerCase().trim();
      const userId = userDoc.id;
      
      if (userEmail === emailToCheck) {
        if (userId === correctUid) {
          // Correct entry exists
          correctExists = true;
          console.log(`[fixUserCompanyAccess] Correct user document exists: ${correctUid}`);
        } else {
          // Wrong UID - remove it
          try {
            await deleteDoc(doc(db, 'companies', companyId, 'users', userId));
            removed.push(userId);
            console.log(`[fixUserCompanyAccess] Removed wrong UID: ${userId}`);
          } catch (error) {
            console.error(`[fixUserCompanyAccess] Error removing ${userId}:`, error);
          }
        }
      }
    }
    
    // Create correct user document if it doesn't exist
    if (!correctExists) {
      const roleModules = {
        owner: ['expenses', 'income', 'marketing', 'forecasting', 'reports', 'settings', 'team'],
        manager: ['expenses', 'income', 'marketing', 'forecasting', 'reports', 'settings', 'team'],
        employee: ['expenses'],
        accountant: ['expenses', 'income', 'reports']
      };
      
      const userRef = doc(db, 'companies', companyId, 'users', correctUid);
      await setDoc(userRef, {
        email: email,
        role: role,
        accessModules: roleModules[role] || ['expenses'],
        subscriptionTier: 'lite',
        joinedAt: serverTimestamp(),
        fixed: true // Flag to indicate this was auto-fixed
      });
      
      console.log(`[fixUserCompanyAccess] Created correct user document: ${correctUid}`);
      return { removed, created: true };
    }
    
    return { removed, created: false };
  } catch (error) {
    console.error('[fixUserCompanyAccess] Error fixing user access:', error);
    throw error;
  }
};

