/**
 * MULTI-FACTOR AUTHENTICATION (MFA) UTILITIES
 * 
 * Implements TOTP (Time-based One-Time Password) for MFA using otplib.
 * Generates secrets, creates QR codes, and verifies codes.
 * 
 * Usage:
 * import { generateMFASecret, getMFATokenURL, verifyMFACode } from '@/utils/mfa';
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { encryptSensitiveField, decryptSensitiveField } from './encryption';

// Set TOTP options
authenticator.options = {
  step: 30, // 30-second time steps
  window: [1, 0], // Allow 1 step before/after current time
};

/**
 * Generate a new MFA secret for a user
 * @param {string} userId - User ID
 * @param {string} userEmail - User email (for QR code label)
 * @returns {Promise<{secret: string, qrCode: string}>} - Secret and QR code data URL
 */
export async function generateMFASecret(userId, userEmail) {
  try {
    // Generate a unique secret
    const secret = authenticator.generateSecret();
    
    // Create service name for the authenticator app
    const serviceName = 'Biz-CoPilot';
    const issuer = 'Biz-CoPilot';
    
    // Encrypt the secret before storing
    const encryptedSecret = await encryptSensitiveField(secret);
    
    // Store encrypted secret in Firestore
    const mfaRef = doc(db, 'users', userId, 'security', 'mfa');
    await setDoc(mfaRef, {
      secret: encryptedSecret,
      enabled: false, // Not enabled until verified
      createdAt: new Date().toISOString(),
      verifiedAt: null,
      backupCodes: [] // Will be generated after verification
    }, { merge: true });
    
    // Generate QR code
    const otpAuthUrl = authenticator.keyuri(userEmail, issuer, secret);
    const qrCode = await QRCode.toDataURL(otpAuthUrl);
    
    return {
      secret,
      encryptedSecret,
      qrCode,
      otpAuthUrl
    };
  } catch (error) {
    console.error('Error generating MFA secret:', error);
    throw new Error('Failed to generate MFA secret');
  }
}

/**
 * Verify MFA code
 * @param {string} userId - User ID
 * @param {string} code - 6-digit TOTP code from authenticator app
 * @returns {Promise<boolean>} - True if code is valid
 */
export async function verifyMFACode(userId, code) {
  try {
    // Get encrypted secret from Firestore
    const mfaRef = doc(db, 'users', userId, 'security', 'mfa');
    const mfaDoc = await getDoc(mfaRef);
    
    if (!mfaDoc.exists()) {
      throw new Error('MFA not set up for this user');
    }
    
    const mfaData = mfaDoc.data();
    
    if (!mfaData.secret) {
      throw new Error('MFA secret not found');
    }
    
    // Decrypt the secret
    const secret = await decryptSensitiveField(mfaData.secret);
    
    // Verify the code
    const isValid = authenticator.verify({ token: code, secret });
    
    if (isValid) {
      // If this is the first verification, enable MFA and generate backup codes
      if (!mfaData.enabled) {
        const backupCodes = generateBackupCodes();
        const encryptedBackupCodes = await Promise.all(
          backupCodes.map(code => encryptSensitiveField(code))
        );
        
        await updateDoc(mfaRef, {
          enabled: true,
          verifiedAt: new Date().toISOString(),
          backupCodes: encryptedBackupCodes
        });
        
        // Return plain backup codes for user to see (only once)
        return { valid: true, backupCodes: backupCodes };
      }
      
      return { valid: true };
    }
    
    return { valid: false };
  } catch (error) {
    console.error('Error verifying MFA code:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Generate backup codes for MFA
 * @returns {string[]} - Array of 10 backup codes
 */
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric codes
    const code = Math.random().toString(36).substring(2, 10).toUpperCase() +
                 Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code.substring(0, 8));
  }
  return codes;
}

/**
 * Verify backup code
 * @param {string} userId - User ID
 * @param {string} code - Backup code
 * @returns {Promise<boolean>} - True if code is valid
 */
export async function verifyBackupCode(userId, code) {
  try {
    const mfaRef = doc(db, 'users', userId, 'security', 'mfa');
    const mfaDoc = await getDoc(mfaRef);
    
    if (!mfaDoc.exists()) {
      return false;
    }
    
    const mfaData = mfaDoc.data();
    const backupCodes = mfaData.backupCodes || [];
    
    // Decrypt and check each backup code
    for (let i = 0; i < backupCodes.length; i++) {
      try {
        const decryptedCode = await decryptSensitiveField(backupCodes[i]);
        if (decryptedCode === code.toUpperCase()) {
          // Remove used backup code
          const updatedCodes = [...backupCodes];
          updatedCodes.splice(i, 1);
          
          await updateDoc(mfaRef, {
            backupCodes: updatedCodes
          });
          
          return true;
        }
      } catch (error) {
        console.error('Error decrypting backup code:', error);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
}

/**
 * Check if MFA is enabled for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if MFA is enabled
 */
export async function isMFAEnabled(userId) {
  try {
    const mfaRef = doc(db, 'users', userId, 'security', 'mfa');
    const mfaDoc = await getDoc(mfaRef);
    
    if (!mfaDoc.exists()) {
      return false;
    }
    
    const mfaData = mfaDoc.data();
    return mfaData.enabled === true;
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return false;
  }
}

/**
 * Disable MFA for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
export async function disableMFA(userId) {
  try {
    const mfaRef = doc(db, 'users', userId, 'security', 'mfa');
    await updateDoc(mfaRef, {
      enabled: false,
      disabledAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error disabling MFA:', error);
    throw new Error('Failed to disable MFA');
  }
}

/**
 * Get remaining backup codes count
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of remaining backup codes
 */
export async function getRemainingBackupCodes(userId) {
  try {
    const mfaRef = doc(db, 'users', userId, 'security', 'mfa');
    const mfaDoc = await getDoc(mfaRef);
    
    if (!mfaDoc.exists()) {
      return 0;
    }
    
    const mfaData = mfaDoc.data();
    return (mfaData.backupCodes || []).length;
  } catch (error) {
    console.error('Error getting backup codes count:', error);
    return 0;
  }
}

