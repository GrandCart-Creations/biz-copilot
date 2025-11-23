/**
 * DATA ENCRYPTION UTILITIES
 * 
 * Provides encryption/decryption for sensitive data at rest.
 * Uses AES-256 encryption for sensitive fields like:
 * - Financial amounts
 * - VAT numbers
 * - Bank account details
 * - Invoice numbers
 * 
 * IMPORTANT: In production, encryption keys should be stored securely
 * (Firebase Secret Manager or environment variables, never in client code)
 * 
 * Usage:
 * import { encryptSensitiveField, decryptSensitiveField } from '@/utils/encryption';
 * 
 * const encrypted = await encryptSensitiveField('sensitive-data');
 * const decrypted = await decryptSensitiveField(encrypted);
 */

// Get encryption key from environment (fallback for development)
const getEncryptionKey = () => {
  // In production, this should come from secure storage
  const envKey = import.meta.env.VITE_ENCRYPTION_KEY;
  
  if (envKey && envKey.length >= 32) {
    // Convert hex string to Uint8Array
    return new TextEncoder().encode(envKey.substring(0, 32));
  }
  
  // Fallback: Generate from fixed string (NOT SECURE - use env var in production)
  console.warn('⚠️ Using fallback encryption key. Set VITE_ENCRYPTION_KEY in production!');
  const fallback = 'biz-copilot-default-key-change-me!';
  return new TextEncoder().encode(fallback.padEnd(32, '0').substring(0, 32));
};

// Get fallback encryption key (for backward compatibility with old data)
const getFallbackEncryptionKey = () => {
  const fallback = 'biz-copilot-default-key-change-me!';
  return new TextEncoder().encode(fallback.padEnd(32, '0').substring(0, 32));
};

/**
 * Derive a key from password using PBKDF2
 */
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive data
 * @param {string} plaintext - Data to encrypt
 * @returns {Promise<string>} - Base64 encoded encrypted data with IV
 */
export async function encryptSensitiveField(plaintext) {
  if (!plaintext) return null;
  
  try {
    const password = getEncryptionKey();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const key = await deriveKey(new TextDecoder().decode(password), salt);
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Return as base64 string
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {boolean} tryFallback - Whether to try fallback key if primary fails
 * @returns {Promise<string>} - Decrypted plaintext
 */
export async function decryptSensitiveField(encryptedData, tryFallback = true) {
  if (!encryptedData) return null;
  
  // Try with primary key first
  try {
    const password = getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    const key = await deriveKey(new TextDecoder().decode(password), salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (primaryError) {
    // If primary key fails and fallback is enabled, try fallback key
    if (tryFallback) {
      try {
        const fallbackPassword = getFallbackEncryptionKey();
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encrypted = combined.slice(28);
        
        const key = await deriveKey(new TextDecoder().decode(fallbackPassword), salt);
        
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encrypted
        );
        
        return new TextDecoder().decode(decrypted);
      } catch (fallbackError) {
        // Both keys failed - only log in development to reduce console noise
        if (import.meta.env.DEV) {
          console.warn('Decryption failed with both primary and fallback keys:', {
            primary: primaryError.message,
            fallback: fallbackError.message
          });
        }
        throw new Error('Failed to decrypt data');
      }
    } else {
      // Only log in development to reduce console noise
      if (import.meta.env.DEV) {
        console.warn('Decryption error:', primaryError);
      }
      throw new Error('Failed to decrypt data');
    }
  }
}

/**
 * Encrypt an object's sensitive fields
 * @param {object} data - Object with potentially sensitive fields
 * @param {string[]} sensitiveFields - Array of field names to encrypt
 * @returns {Promise<object>} - Object with encrypted fields
 */
export async function encryptSensitiveFields(data, sensitiveFields = [
  'amount',
  'vatNumber',
  'bankAccount',
  'invoiceNumber',
  'accountNumber',
  'routingNumber',
  'ssn',
  'taxId'
]) {
  const encrypted = { ...data };
  
  for (const field of sensitiveFields) {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      // Convert to string for encryption (numbers need to be stringified)
      const value = typeof encrypted[field] === 'number' 
        ? encrypted[field].toString() 
        : String(encrypted[field]);
      
      if (value && value.trim() !== '') {
        encrypted[field] = await encryptSensitiveField(value);
        encrypted[`${field}_encrypted`] = true; // Flag to indicate encryption
      }
    }
  }
  
  return encrypted;
}

/**
 * Decrypt an object's sensitive fields
 * @param {object} data - Object with encrypted fields
 * @param {string[]} sensitiveFields - Array of field names to decrypt
 * @returns {Promise<object>} - Object with decrypted fields
 */
export async function decryptSensitiveFields(data, sensitiveFields = [
  'amount',
  'vatNumber',
  'bankAccount',
  'invoiceNumber',
  'accountNumber',
  'routingNumber',
  'ssn',
  'taxId'
]) {
  const decrypted = { ...data };
  
  for (const field of sensitiveFields) {
    if (decrypted[`${field}_encrypted`] && decrypted[field]) {
      try {
        const decryptedValue = await decryptSensitiveField(decrypted[field], true);
        
        // Convert back to number if it was originally a number field
        if (field === 'amount' && !isNaN(decryptedValue)) {
          decrypted[field] = parseFloat(decryptedValue);
        } else {
          decrypted[field] = decryptedValue;
        }
        
        delete decrypted[`${field}_encrypted`];
      } catch (error) {
        // Only log in development to reduce console noise in production
        // The encrypted value is kept, so the app continues to function
        if (import.meta.env.DEV) {
          console.warn(`Failed to decrypt ${field} (keeping encrypted value):`, error);
        }
        // Keep encrypted value on error - app will continue to function
      }
    }
  }
  
  return decrypted;
}

