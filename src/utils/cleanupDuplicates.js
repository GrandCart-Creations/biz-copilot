/**
 * CLEANUP DUPLICATE USER DOCUMENTS
 * 
 * This utility helps identify and clean up duplicate user entries
 * with incorrect User IDs (like the 647411 issue)
 */

import { db } from '../firebase';
import { collection, doc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

/**
 * Find and remove duplicate user documents with wrong UIDs
 * @param {string} companyId - Company ID to clean up
 * @param {string} email - Email to check for duplicates
 * @param {string} correctUid - The correct Firebase Auth UID
 * @returns {Promise<{removed: number, kept: string}>}
 */
export const cleanupDuplicateUsers = async (companyId, email, correctUid) => {
  try {
    const usersRef = collection(db, 'companies', companyId, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const duplicates = [];
    let correctUserDoc = null;
    
    const emailToCheck = email.toLowerCase().trim();
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userEmail = (userData.email || '').toLowerCase().trim();
      const userId = userDoc.id;
      
      if (userEmail === emailToCheck) {
        if (userId === correctUid) {
          // This is the correct one - keep it
          correctUserDoc = { id: userId, data: userData };
        } else {
          // Wrong UID - mark for deletion
          duplicates.push({ id: userId, email: userData.email, role: userData.role });
        }
      }
    });
    
    // Delete duplicates
    let removed = 0;
    for (const duplicate of duplicates) {
      try {
        const duplicateRef = doc(db, 'companies', companyId, 'users', duplicate.id);
        await deleteDoc(duplicateRef);
        removed++;
        console.log(`[cleanupDuplicates] Removed duplicate user ${duplicate.id} (email: ${duplicate.email})`);
      } catch (error) {
        console.error(`[cleanupDuplicates] Error removing duplicate ${duplicate.id}:`, error);
      }
    }
    
    // If no correct user doc exists but we have duplicates, create it
    if (!correctUserDoc && duplicates.length > 0 && correctUid) {
      console.warn(`[cleanupDuplicates] No correct user document found. User may need to be re-added with correct UID.`);
    }
    
    return {
      removed,
      kept: correctUserDoc ? correctUserDoc.id : null,
      duplicates: duplicates.map(d => d.id)
    };
  } catch (error) {
    console.error('[cleanupDuplicates] Error cleaning up duplicates:', error);
    throw error;
  }
};

/**
 * Find all duplicate users across all companies for a specific email
 * @param {string} email - Email to check
 * @returns {Promise<Array>} Array of {companyId, companyName, userId, email, role}
 */
export const findAllDuplicateUsers = async (email) => {
  try {
    const companiesRef = collection(db, 'companies');
    const companiesSnapshot = await getDocs(companiesRef);
    
    const duplicates = [];
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      const companyName = companyDoc.data().name || 'Unknown';
      
      const usersRef = collection(db, 'companies', companyId, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const userEmail = (userData.email || '').toLowerCase().trim();
        
        if (userEmail === email.toLowerCase().trim()) {
          duplicates.push({
            companyId,
            companyName,
            userId: userDoc.id,
            email: userData.email,
            role: userData.role,
            joinedAt: userData.joinedAt
          });
        }
      });
    }
    
    return duplicates;
  } catch (error) {
    console.error('[cleanupDuplicates] Error finding duplicates:', error);
    throw error;
  }
};

