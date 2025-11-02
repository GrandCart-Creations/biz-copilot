/**
 * COMPANY UTILITIES
 * 
 * Functions for managing company data and settings
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Update company name
 * @param {string} companyId - Company ID
 * @param {string} newName - New company name
 * @returns {Promise<void>}
 */
export async function updateCompanyName(companyId, newName) {
  if (!companyId || !newName || !newName.trim()) {
    throw new Error('Company ID and name are required');
  }

  try {
    const companyRef = doc(db, 'companies', companyId);
    await updateDoc(companyRef, {
      name: newName.trim(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating company name:', error);
    throw error;
  }
}

/**
 * Get company details
 * @param {string} companyId - Company ID
 * @returns {Promise<object>} Company data
 */
export async function getCompany(companyId) {
  try {
    const companyRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      throw new Error('Company not found');
    }

    return {
      id: companyDoc.id,
      ...companyDoc.data()
    };
  } catch (error) {
    console.error('Error getting company:', error);
    throw error;
  }
}

export default {
  updateCompanyName,
  getCompany
};

