// src/firebase.js - ENHANCED VERSION
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  Timestamp,
  arrayUnion,
  increment,
  limit,
  runTransaction
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { encryptSensitiveFields, decryptSensitiveFields } from './utils/encryption';

const readEnv = (key, optional = false) => {
  const value = import.meta.env[key];
  if (!value && !optional) {
    const message = `Missing required Firebase environment variable: ${key}`;
    if (import.meta.env.DEV) {
      console.warn(message);
    } else {
      throw new Error(message);
    }
  }
  return value;
};

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID', true) // Optional - only needed for Analytics
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
const functions = getFunctions(app, 'europe-west1');

// ==================== ERROR HANDLING ====================

// User-friendly error messages
const getErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email': 'Invalid email address. Please check and try again.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters with a mix of letters and numbers.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later or reset your password.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/cancelled-popup-request': 'Only one popup request is allowed at a time.',
    'auth/popup-blocked': 'Sign-in popup was blocked by your browser. Please allow popups for this site.',
  };
  
  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
};

// ==================== AUTH FUNCTIONS ====================

// Sign up with email and password + email verification
export const signUpWithEmail = async (email, password, displayName = null) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name if provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Do NOT auto-send verification here.
    // We let the onboarding wizard explicitly trigger a fresh verification email,
    // so users don't receive two emails (auto + manual).
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName || email.split('@')[0],
      createdAt: serverTimestamp(),
      emailVerified: false,
      role: 'user', // Default role for new users
      settings: {
        currency: 'EUR',
        language: 'en',
        notifications: true
      }
    });
    
    return {
      user,
      message: 'Account created! Please check your email to verify your account.'
    };
  } catch (error) {
    console.error('Error signing up:', error);
    throw new Error(getErrorMessage(error.code));
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified (optional - you can enforce this)
    // if (!user.emailVerified) {
    //   throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
    // }
    
    return user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw new Error(getErrorMessage(error.code));
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user document exists, if not create it
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        emailVerified: user.emailVerified,
        role: 'user',
        provider: 'google',
        settings: {
          currency: 'EUR',
          language: 'en',
          notifications: true
        }
      });
    }
    
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw new Error(getErrorMessage(error.code));
  }
};

// Send password reset email
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return 'Password reset email sent! Check your inbox.';
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error(getErrorMessage(error.code));
  }
};

// Resend email verification with rate limiting and better error handling
let lastVerificationSent = null;
const VERIFICATION_COOLDOWN = 60000; // 60 seconds cooldown

export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in.');
    }
    
    // Reload user to get latest verification status
    await user.reload();
    
    if (user.emailVerified) {
      return 'Your email is already verified!';
    }
    
    // Rate limiting: prevent rapid resends
    const now = Date.now();
    if (lastVerificationSent && (now - lastVerificationSent) < VERIFICATION_COOLDOWN) {
      const remainingSeconds = Math.ceil((VERIFICATION_COOLDOWN - (now - lastVerificationSent)) / 1000);
      throw new Error(`Please wait ${remainingSeconds} seconds before requesting another verification email.`);
    }
    
    // Send via Cloud Function so the email comes from your custom domain (SendGrid)
    const fn = httpsCallable(functions, 'sendAuthVerificationEmail');
    await fn({ email: user.email });
    lastVerificationSent = now;
    
    return 'Verification email sent! Please check your inbox (and spam/junk folder). The link will expire in 1 hour.';
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please wait a few minutes before trying again.');
    }
    
    throw new Error(error.message || 'Failed to send verification email. Please try again.');
  }
};

// Check if email is verified (reloads user first)
export const checkEmailVerification = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in.');
    }
    
    // Try to reload user to get latest verification status from Firebase
    try {
      await user.reload();
    } catch (reloadError) {
      // Handle rate limiting or network errors gracefully
      const errorMessage = reloadError.message || reloadError.code || '';
      if (errorMessage.includes('granttoken-are-blocked') || 
          errorMessage.includes('network') ||
          errorMessage.includes('quota') ||
          errorMessage.includes('too-many-requests')) {
        // Return cached local status instead of failing completely
        console.debug('Token refresh temporarily blocked, using cached verification status');
        return {
          verified: user.emailVerified || false,
          email: user.email,
          cached: true
        };
      }
      // Re-throw other errors
      throw reloadError;
    }
    
    return {
      verified: user.emailVerified || false,
      email: user.email
    };
  } catch (error) {
    console.error('Error checking email verification:', error);
    throw new Error('Failed to check verification status. Please try again.');
  }
};

// Send email verification (accepts user object)
export const sendEmailVerificationToUser = async (user) => {
  try {
    if (!user) {
      throw new Error('User is required.');
    }
    
    // Reload user to get latest verification status
    await user.reload();
    
    if (user.emailVerified) {
      return 'Your email is already verified!';
    }
    
    // Send via Cloud Function so the email comes from your custom domain (SendGrid)
    const fn = httpsCallable(functions, 'sendAuthVerificationEmail');
    await fn({ email: user.email });
    return 'Verification email sent! Please check your inbox (and spam/junk folder). The link will expire in 1 hour.';
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please wait a few minutes before trying again.');
    }
    
    throw new Error(error.message || 'Failed to send verification email. Please try again.');
  }
};

// Sign out
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Auth state observer
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ==================== USER MANAGEMENT ====================

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Also update auth profile if displayName or photoURL changed
    if (data.displayName || data.photoURL) {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: data.displayName || user.displayName,
          photoURL: data.photoURL || user.photoURL
        });
      }
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const uploadProfilePhoto = async (userId, file, previousPath = '') => {
  try {
    if (!userId || !file) {
      throw new Error('User ID and file are required to upload a profile photo.');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are supported for profile photos.');
    }

    const sanitizedName = file.name.replace(/\s+/g, '_');
    const storagePath = `users/${userId}/profile/${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    if (previousPath) {
      try {
        const previousRef = ref(storage, previousPath);
        await deleteObject(previousRef);
      } catch (cleanupError) {
        console.warn('Failed to delete previous profile photo:', cleanupError);
      }
    }

    return {
      photoURL: downloadURL,
      photoStoragePath: storagePath,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
};

// ==================== FIRESTORE - EXPENSES ====================

// ==================== COMPANY-BASED EXPENSES (NEW STRUCTURE) ====================
// These functions use the new company structure: companies/{companyId}/expenses

/**
 * Get all expenses for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of expense objects
 */
export const getCompanyExpenses = async (companyId) => {
  try {
    const expensesRef = collection(db, 'companies', companyId, 'expenses');
    const q = query(expensesRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const expenses = [];
    
    // Decrypt sensitive fields for each expense
    for (const docSnapshot of querySnapshot.docs) {
      const expenseData = docSnapshot.data();
      const sensitiveFields = ['amount', 'vatNumber', 'bankAccount', 'invoiceNumber'];
      
      try {
        // Check if fields are encrypted
        const hasEncryptedFields = sensitiveFields.some(field => expenseData[`${field}_encrypted`]);
        
        if (hasEncryptedFields) {
          const decryptedData = await decryptSensitiveFields(expenseData, sensitiveFields);
          expenses.push({
            id: docSnapshot.id,
            ...decryptedData
          });
        } else {
          expenses.push({
            id: docSnapshot.id,
            ...expenseData
          });
        }
      } catch (decryptError) {
        console.error('Error decrypting expense:', decryptError);
        expenses.push({
          id: docSnapshot.id,
          ...expenseData,
          _decryptionError: true
        });
      }
    }
    
    return expenses;
  } catch (error) {
    console.error('Error getting company expenses:', error);
    throw error;
  }
};

/**
 * Add expense to a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID (for audit)
 * @param {object} expenseData - Expense data
 * @returns {Promise<string>} Expense document ID
 */
export const addCompanyExpense = async (companyId, userId, expenseData) => {
  try {
    const sensitiveFields = ['amount', 'vatNumber', 'bankAccount', 'invoiceNumber'];
    const encryptedData = await encryptSensitiveFields(expenseData, sensitiveFields);
    
    const expensesRef = collection(db, 'companies', companyId, 'expenses');
    const docRef = await addDoc(expensesRef, {
      ...encryptedData,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    try {
      const ledgerEntryId = await createExpenseLedgerEntry(
        companyId,
        docRef.id,
        {
          ...expenseData,
          createdBy: userId
        },
        userId
      );

      if (ledgerEntryId) {
        await updateDoc(docRef, {
          ledgerEntryId,
          updatedAt: serverTimestamp()
        });
      }
    } catch (ledgerError) {
      console.error('Error creating ledger entry for expense:', ledgerError);
    }

    return docRef.id;
  } catch (error) {
    console.error('Error adding company expense:', error);
    throw error;
  }
};

/**
 * Update expense in a company
 * @param {string} companyId - Company ID
 * @param {string} expenseId - Expense ID
 * @param {object} expenseData - Updated expense data
 */
export const updateCompanyExpense = async (companyId, expenseId, expenseData) => {
  try {
    const sensitiveFields = ['amount', 'vatNumber', 'bankAccount', 'invoiceNumber'];
    const expenseRef = doc(db, 'companies', companyId, 'expenses', expenseId);

    const existingSnapshot = await getDoc(expenseRef);
    const existingRawData = existingSnapshot.exists() ? existingSnapshot.data() : null;
    const existingData = existingRawData
      ? await decryptSensitiveFields(existingRawData, sensitiveFields)
      : {};

    const encryptedData = await encryptSensitiveFields(expenseData, sensitiveFields);

    await updateDoc(expenseRef, {
      ...encryptedData,
      updatedAt: serverTimestamp()
    });

    const ledgerRelevantFields = [
      'amount',
      'currency',
      'financialAccountId',
      'paymentStatus',
      'category',
      'invoiceDate',
      'date',
      'documentType'
    ];

    const shouldRebuildLedger = (
      !existingData?.ledgerEntryId ||
      ledgerRelevantFields.some((field) => Object.prototype.hasOwnProperty.call(expenseData, field))
    );

    if (shouldRebuildLedger) {
      if (existingData?.ledgerEntryId) {
        try {
          await reverseLedgerEntry(companyId, existingData.ledgerEntryId, expenseData.updatedBy || existingData.updatedBy || '');
        } catch (reverseError) {
          console.error('Failed to reverse previous ledger entry for expense:', reverseError);
        }
      }

      const mergedData = {
        ...existingData,
        ...expenseData
      };

      try {
        // Use the current user ID for ledger entry creation
        // This ensures the ledger entry is created with proper permissions
        let userIdForLedger = expenseData.updatedBy || existingData.updatedBy || '';
        
        // If no user ID provided or it's a system ID, try to get from auth
        if (!userIdForLedger || userIdForLedger.startsWith('system-')) {
          try {
            const currentUser = getCurrentUser();
            userIdForLedger = currentUser?.uid || existingData.createdBy || userIdForLedger;
          } catch {
            // Fallback to expense creator if we can't get current user
            userIdForLedger = existingData.createdBy || userIdForLedger;
          }
        }
        
        const ledgerEntryId = await createExpenseLedgerEntry(
          companyId,
          expenseId,
          mergedData,
          userIdForLedger
        );

        await updateDoc(expenseRef, {
          ledgerEntryId: ledgerEntryId || '',
          updatedAt: serverTimestamp()
        });
      } catch (ledgerError) {
        console.error('Failed to rebuild ledger entry for expense:', ledgerError);
      }
    }
  } catch (error) {
    console.error('Error updating company expense:', error);
    throw error;
  }
};

/**
 * Delete expense from a company
 * @param {string} companyId - Company ID
 * @param {string} expenseId - Expense ID
 */
export const deleteCompanyExpense = async (companyId, expenseId) => {
  try {
    const expenseRef = doc(db, 'companies', companyId, 'expenses', expenseId);
    const expenseDoc = await getDoc(expenseRef);

    if (expenseDoc.exists()) {
      const expenseData = expenseDoc.data();
      if (expenseData?.ledgerEntryId) {
        try {
          await reverseLedgerEntry(
            companyId,
            expenseData.ledgerEntryId,
            expenseData.updatedBy || expenseData.createdBy || ''
          );
        } catch (reverseError) {
          console.error('Failed to reverse ledger entry before deleting expense:', reverseError);
        }
      }
    }

    await deleteDoc(expenseRef);
  } catch (error) {
    console.error('Error deleting company expense:', error);
    throw error;
  }
};

// ==================== USER-BASED EXPENSES (LEGACY - BACKWARD COMPATIBLE) ====================
// These functions maintain compatibility with existing user-based structure

// Get all expenses for a user
export const getUserExpenses = async (userId) => {
  try {
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const q = query(expensesRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const expenses = [];
    
    // Decrypt sensitive fields for each expense
    for (const docSnapshot of querySnapshot.docs) {
      const expenseData = docSnapshot.data();
      const sensitiveFields = ['amount', 'vatNumber', 'bankAccount', 'invoiceNumber'];
      
      try {
        // Check if fields are encrypted
        const hasEncryptedFields = sensitiveFields.some(field => expenseData[`${field}_encrypted`]);
        
        if (hasEncryptedFields) {
          const decryptedData = await decryptSensitiveFields(expenseData, sensitiveFields);
          expenses.push({
            id: docSnapshot.id,
            ...decryptedData
          });
        } else {
          // Legacy data not encrypted yet
          expenses.push({
            id: docSnapshot.id,
            ...expenseData
          });
        }
      } catch (decryptError) {
        console.error('Error decrypting expense:', decryptError);
        // Return encrypted data on error (user can still see structure)
        expenses.push({
          id: docSnapshot.id,
          ...expenseData,
          _decryptionError: true
        });
      }
    }
    
    return expenses;
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

// Add a new expense
export const addExpense = async (userId, expenseData) => {
  try {
    // Encrypt sensitive fields before storing
    const sensitiveFields = ['amount', 'vatNumber', 'bankAccount', 'invoiceNumber'];
    const encryptedData = await encryptSensitiveFields(expenseData, sensitiveFields);
    
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const docRef = await addDoc(expensesRef, {
      ...encryptedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

// Update an expense
export const updateExpense = async (userId, expenseId, expenseData) => {
  try {
    // Encrypt sensitive fields before storing
    const sensitiveFields = ['amount', 'vatNumber', 'bankAccount', 'invoiceNumber'];
    const encryptedData = await encryptSensitiveFields(expenseData, sensitiveFields);
    
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    await updateDoc(expenseRef, {
      ...encryptedData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

// Delete an expense
export const deleteExpense = async (userId, expenseId) => {
  try {
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

// ==================== FIRESTORE - ACCOUNTS ====================

// Get all accounts for a user
export const getUserAccounts = async (userId) => {
  try {
    const accountsRef = collection(db, 'users', userId, 'accounts');
    const querySnapshot = await getDocs(accountsRef);
    
    const accounts = [];
    querySnapshot.forEach((doc) => {
      accounts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return accounts;
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw error;
  }
};

// Add a new account
export const addAccount = async (userId, accountData) => {
  try {
    const accountsRef = collection(db, 'users', userId, 'accounts');
    
    // Use the account ID as the document ID if provided
    if (accountData.id) {
      const accountRef = doc(accountsRef, accountData.id);
      await setDoc(accountRef, {
        ...accountData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      return accountData.id;
    } else {
      const docRef = await addDoc(accountsRef, {
        ...accountData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (error) {
    console.error('Error adding account:', error);
    throw error;
  }
};

// Update an account
export const updateAccount = async (userId, accountId, accountData) => {
  try {
    const accountRef = doc(db, 'users', userId, 'accounts', accountId);
    await updateDoc(accountRef, {
      ...accountData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

// Delete an account
export const deleteAccount = async (userId, accountId) => {
  try {
    const accountRef = doc(db, 'users', userId, 'accounts', accountId);
    await deleteDoc(accountRef);
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

// ==================== COMPANY-BASED ACCOUNTS (NEW STRUCTURE) ====================

/**
 * Get all accounts for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of account objects
 */
export const getCompanyAccounts = async (companyId) => {
  try {
    const accountsRef = collection(db, 'companies', companyId, 'accounts');
    const querySnapshot = await getDocs(accountsRef);
    
    const accounts = [];
    querySnapshot.forEach((doc) => {
      accounts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return accounts;
  } catch (error) {
    console.error('Error getting company accounts:', error);
    throw error;
  }
};

/**
 * Add a new account to a company
 * @param {string} companyId - Company ID
 * @param {object} accountData - Account data
 * @returns {Promise<string>} Account document ID
 */
export const addCompanyAccount = async (companyId, accountData) => {
  try {
    const accountsRef = collection(db, 'companies', companyId, 'accounts');
    
    // Use the account ID as the document ID if provided
    if (accountData.id) {
      const accountRef = doc(accountsRef, accountData.id);
      await setDoc(accountRef, {
        ...accountData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      return accountData.id;
    } else {
      const docRef = await addDoc(accountsRef, {
        ...accountData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (error) {
    console.error('Error adding company account:', error);
    throw error;
  }
};

/**
 * Update an account in a company
 * @param {string} companyId - Company ID
 * @param {string} accountId - Account ID
 * @param {object} accountData - Updated account data
 */
export const updateCompanyAccount = async (companyId, accountId, accountData) => {
  try {
    const accountRef = doc(db, 'companies', companyId, 'accounts', accountId);
    await updateDoc(accountRef, {
      ...accountData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating company account:', error);
    throw error;
  }
};

/**
 * Delete an account from a company
 * @param {string} companyId - Company ID
 * @param {string} accountId - Account ID
 */
export const deleteCompanyAccount = async (companyId, accountId) => {
  try {
    const accountRef = doc(db, 'companies', companyId, 'accounts', accountId);
    await deleteDoc(accountRef);
  } catch (error) {
    console.error('Error deleting company account:', error);
    throw error;
  }
};

// ==================== FIREBASE STORAGE - FILE UPLOADS ====================

// Upload a file to Firebase Storage for an expense
export const uploadExpenseFile = async (userId, expenseId, file, onProgress = null, companyId = null) => {
  try {
    // Validate file size (max 10 MB)
    const maxSize = 10 * 1024 * 1024; // 10 MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10 MB limit');
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PNG, JPG, and PDF files are allowed');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    
    // Use company-based path if company ID provided, otherwise fallback to user path
    const filePath = companyId 
      ? `companies/${companyId}/expenses/${expenseId}/${fileName}`
      : `users/${userId}/expenses/${expenseId}/${fileName}`;

    // Create storage reference
    const storageRef = ref(storage, filePath);

    // Upload with progress tracking
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Error uploading file:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                fileName: file.name,
                fileUrl: downloadURL,
                filePath: filePath,
                fileType: file.type,
                fileSize: file.size,
                uploadedAt: new Date().toISOString()
              });
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      // Simple upload without progress tracking
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      return {
        fileName: file.name,
        fileUrl: downloadURL,
        filePath: filePath,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Get all files for an expense from Storage
export const getExpenseFiles = async (userId, expenseId) => {
  try {
    const folderPath = `users/${userId}/expenses/${expenseId}`;
    const folderRef = ref(storage, folderPath);

    const filesList = await listAll(folderRef);

    const files = await Promise.all(
      filesList.items.map(async (fileRef) => {
        const downloadURL = await getDownloadURL(fileRef);
        return {
          name: fileRef.name,
          url: downloadURL,
          path: fileRef.fullPath
        };
      })
    );

    return files;
  } catch (error) {
    console.error('Error getting expense files:', error);
    throw error;
  }
};

// Delete a file from Storage
export const deleteExpenseFile = async (filePath) => {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Get download URL for a file
export const getFileDownloadURL = async (filePath) => {
  try {
    const fileRef = ref(storage, filePath);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
};

// Delete all files for an expense
export const deleteAllExpenseFiles = async (userId, expenseId) => {
  try {
    const folderPath = `users/${userId}/expenses/${expenseId}`;
    const folderRef = ref(storage, folderPath);

    const filesList = await listAll(folderRef);

    // Delete all files in the folder
    await Promise.all(
      filesList.items.map(async (fileRef) => {
        await deleteObject(fileRef);
      })
    );
  } catch (error) {
    console.error('Error deleting expense files:', error);
    throw error;
  }
};

// ==================== PEOPLE PROFILES / HR WORKSPACE ====================

export const getPeopleProfiles = async (companyId) => {
  try {
    const profilesRef = collection(db, 'companies', companyId, 'peopleProfiles');
    const snapshot = await getDocs(profilesRef);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error fetching people profiles:', error);
    throw error;
  }
};

export const getPeopleProfile = async (companyId, userId) => {
  try {
    const profileRef = doc(db, 'companies', companyId, 'peopleProfiles', userId);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      return profileSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching people profile:', error);
    throw error;
  }
};

export const savePeopleProfile = async (companyId, userId, data) => {
  try {
    const profileRef = doc(db, 'companies', companyId, 'peopleProfiles', userId);
    await setDoc(
      profileRef,
      {
        ...data,
        updatedAt: serverTimestamp(),
        createdAt: data?.createdAt || serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving people profile:', error);
    throw error;
  }
};

export const uploadPeopleAttachment = async (companyId, userId, file, onProgress) => {
  try {
    if (!companyId || !userId || !file) {
      throw new Error('Missing companyId, userId, or file for upload.');
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported file type. Please upload PDF or image files.');
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/\s+/g, '_');
    const filePath = `companies/${companyId}/people/${userId}/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, filePath);

    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file);
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              fileName: file.name,
              fileUrl: downloadURL,
              filePath,
              fileType: file.type,
              fileSize: file.size,
              uploadedAt: new Date().toISOString()
            });
          }
        );
      });
    }

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return {
      fileName: file.name,
      fileUrl: downloadURL,
      filePath,
      fileType: file.type,
      fileSize: file.size,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error uploading people attachment:', error);
    throw error;
  }
};

export const removePeopleAttachment = async (companyId, userId, attachment, currentAttachments = []) => {
  try {
    if (attachment?.filePath) {
      try {
        const storageRef = ref(storage, attachment.filePath);
        await deleteObject(storageRef);
      } catch (storageError) {
        console.warn('Failed to delete attachment from storage:', storageError);
      }
    }

    const remaining = currentAttachments.filter((item) => item.filePath !== attachment.filePath);

    await savePeopleProfile(companyId, userId, {
      attachments: remaining.map((item) => ({
        ...item,
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
    });

    return remaining;
  } catch (error) {
    console.error('Error removing people attachment:', error);
    throw error;
  }
};

// ==================== TEAM MANAGEMENT ====================

/**
 * Get all team members for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of team member objects
 */
export const getCompanyMembers = async (companyId) => {
  try {
    const usersRef = collection(db, 'companies', companyId, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    const members = [];
    const userIdsSeen = new Set();
    const emailsSeen = new Set();
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;
      const email = (userData.email || '').toLowerCase().trim();
      
      // Deduplication: Check by userId first (most reliable)
      if (userIdsSeen.has(userId)) {
        // Silent skip - same userId appearing twice is likely a data issue, not worth warning
        return;
      }
      
      // Also check by email to catch cases where same email might have different UIDs
      if (email && emailsSeen.has(email)) {
        // Check if this is a real duplicate (different UID with same email)
        const existingEntry = members.find(m => m.email && m.email.toLowerCase() === email);
        if (existingEntry && existingEntry.userId !== userId) {
          // This is a real duplicate - log once per duplicate pair
          console.warn(`[getCompanyMembers] Duplicate email detected: ${email} with different userIds (${existingEntry.userId} vs ${userId}). Keeping ${existingEntry.userId}, skipping ${userId}. Use Team Management to remove invalid duplicates.`);
          return;
        }
        // Same email and same userId - just skip silently (already processed)
        return;
      }
      
      userIdsSeen.add(userId);
      if (email) emailsSeen.add(email);
      
      members.push({
        userId: userId,
        email: userData.email || '',
        role: userData.role || 'employee',
        accessModules: userData.accessModules || [],
        subscriptionTier: userData.subscriptionTier || 'lite',
        joinedAt: userData.joinedAt,
        addedDirectly: userData.addedDirectly || false,
        invitedBy: userData.invitedBy || null,
        ...userData
      });
    });
    
    return members;
  } catch (error) {
    console.error('Error getting company members:', error);
    throw error;
  }
};

/**
 * Invite a user to a company by email
 * @param {string} companyId - Company ID
 * @param {string} email - User email to invite
 * @param {string} role - Role to assign (owner, manager, employee, accountant)
 * @param {string} invitedBy - User ID of the person sending the invitation
 * @returns {Promise<string>} Invitation ID
 */
export const inviteUserToCompany = async (companyId, email, role = 'employee', invitedBy, fullName = '') => {
  try {
    // First check if user is already a member of the company
    const usersRef = collection(db, 'companies', companyId, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const emailToCheck = email.toLowerCase().trim();
    
    // Check if any user with this email already exists as a member
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = (userData.email || '').toLowerCase().trim();
      
      if (userEmail === emailToCheck) {
        throw new Error(`User with email ${email} is already a member of this company. Please remove them first if you want to re-invite.`);
      }
    }
    
    // Check if there's already a pending invitation for this email
    const existingInvitesRef = collection(db, 'companies', companyId, 'invitations');
    const existingQuery = query(existingInvitesRef, where('email', '==', emailToCheck));
    const existingSnapshot = await getDocs(existingQuery);
    
    // Filter to only pending invitations
    const pendingInvites = existingSnapshot.docs.filter(doc => doc.data().status === 'pending');
    
    if (pendingInvites.length > 0) {
      // Cancel existing pending invitations to ensure a fresh onCreate trigger for email send
      const batch = writeBatch(db);
      pendingInvites.forEach(inviteDoc => {
        batch.update(doc(db, 'companies', companyId, 'invitations', inviteDoc.id), {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          cancelledReason: 'Resent: creating a fresh invitation to trigger email'
        });
      });
      await batch.commit();
    }
    
    // Cancel any old (non-pending) invitations for this email to clean up
    const cancelledInvites = existingSnapshot.docs.filter(doc => doc.data().status !== 'pending');
    if (cancelledInvites.length > 0) {
      const batch = writeBatch(db);
      cancelledInvites.forEach(inviteDoc => {
        batch.update(doc(db, 'companies', companyId, 'invitations', inviteDoc.id), {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          cancelledReason: 'New invitation created'
        });
      });
      await batch.commit();
    }
    
    // Create new invitation
    const invitationsRef = collection(db, 'companies', companyId, 'invitations');
    const invitationData = {
      email: email.toLowerCase().trim(),
      fullName: fullName.trim() || '',
      role,
      status: 'pending',
      invitedBy,
      companyId,
      invitedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
      acceptedAt: null,
      acceptedBy: null
    };
    
    const invitationRef = await addDoc(invitationsRef, invitationData);
    return invitationRef.id;
  } catch (error) {
    console.error('Error inviting user to company:', error);
    throw error;
  }
};

/**
 * Get all pending invitations for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of invitation objects
 */
export const getCompanyInvitations = async (companyId) => {
  try {
    const invitationsRef = collection(db, 'companies', companyId, 'invitations');
    const invitationsSnapshot = await getDocs(invitationsRef);
    
    const invitations = [];
    invitationsSnapshot.forEach((doc) => {
      const inviteData = doc.data();
      invitations.push({
        id: doc.id,
        ...inviteData
      });
    });
    
    return invitations;
  } catch (error) {
    console.error('Error getting company invitations:', error);
    throw error;
  }
};

/**
 * Resend an invitation email via Cloud Function
 */
export const resendInvitation = async (companyId, invitationId) => {
  try {
    const callable = httpsCallable(functions, 'resendInvitationEmail');
    const res = await callable({ companyId, invitationId });
    return res.data;
  } catch (error) {
    console.error('Error resending invitation email:', error);
    throw error;
  }
};

/**
 * Cancel/delete an invitation
 * @param {string} companyId - Company ID
 * @param {string} invitationId - Invitation ID
 */
export const cancelInvitation = async (companyId, invitationId) => {
  try {
    const invitationRef = doc(db, 'companies', companyId, 'invitations', invitationId);
    await deleteDoc(invitationRef);
  } catch (error) {
    console.error('Error canceling invitation:', error);
    throw error;
  }
};

/**
 * Update a user's role in a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID
 * @param {string} newRole - New role (owner, manager, employee, accountant, marketingManager)
 * @param {Array} accessModules - Optional: array of access modules
 */
export const updateUserRole = async (companyId, userId, newRole, accessModules = null) => {
  try {
    const userRef = doc(db, 'companies', companyId, 'users', userId);
    const updateData = {
      role: newRole,
      updatedAt: serverTimestamp()
    };
    
    if (accessModules) {
      updateData.accessModules = accessModules;
    } else {
      // Set default access modules based on role
      const roleModules = {
        owner: ['expenses', 'income', 'marketing', 'forecasting', 'reports', 'settings', 'team'],
        manager: ['expenses', 'income', 'marketing', 'forecasting', 'reports'],
        employee: ['expenses'],
        accountant: ['expenses', 'income', 'reports'],
        marketingManager: ['expenses', 'income', 'invoices', 'marketing', 'forecasting', 'reports', 'team']
      };
      updateData.accessModules = roleModules[newRole] || ['expenses'];
    }
    
    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * Remove a user from a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID to remove
 */
export const removeUserFromCompany = async (companyId, userId) => {
  try {
    const userRef = doc(db, 'companies', companyId, 'users', userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.error('Error removing user from company:', error);
    throw error;
  }
};

/**
 * Get all pending invitations for the current user's email
 * @param {string} userEmail - User email to check invitations for
 * @returns {Promise<Array>} Array of invitation objects with company info
 */
export const getUserInvitations = async (userEmail) => {
  try {
    if (!userEmail) return [];
    
    // Since we can't query all companies (permission restrictions),
    // we'll only check invitations for companies the user is a member of or created
    // This is more efficient and respects security rules
    
    const invitations = [];
    
    try {
      // Get companies created by current user (if available via context)
      // For now, we'll try to query only companies we have access to
      const companiesRef = collection(db, 'companies');
      let companiesSnapshot;
      
      try {
        companiesSnapshot = await getDocs(companiesRef);
      } catch {
        // If we can't query all companies (permission denied), that's okay
        // We'll only check invitations in companies the user is already part of
        console.warn('[getUserInvitations] Cannot query all companies, checking known companies only');
        return invitations; // Return empty array instead of throwing
      }
      
      // Try to read invitations for each company, handling permission errors gracefully
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        
        try {
          // Try to read invitations - will only work if user is a member or creator
          const invitationsRef = collection(db, 'companies', companyId, 'invitations');
          const inviteQuery = query(
            invitationsRef,
            where('email', '==', userEmail.toLowerCase().trim()),
            where('status', '==', 'pending')
          );
          const inviteSnapshot = await getDocs(inviteQuery);
          
          inviteSnapshot.forEach((inviteDoc) => {
            invitations.push({
              id: inviteDoc.id,
              companyId,
              companyName: companyDoc.data().name || 'Unknown Company',
              ...inviteDoc.data()
            });
          });
        } catch (inviteError) {
          // Permission denied for this company's invitations - skip silently
          // This is expected for companies the user is not a member of
          if (inviteError.code !== 'permission-denied') {
            console.warn(`[getUserInvitations] Error checking invitations for company ${companyId}:`, inviteError);
          }
        }
      }
    } catch (error) {
      // If we can't query at all, return empty array instead of throwing
      // This prevents blocking the UI
      if (error.code !== 'permission-denied') {
        console.error('Error getting user invitations:', error);
      }
      return invitations; // Return empty array on permission errors
    }
    
    return invitations;
  } catch (error) {
    // Final catch-all: return empty array instead of throwing to prevent UI blocking
    console.warn('Error in getUserInvitations, returning empty array:', error.message);
    return [];
  }
};

/**
 * Accept an invitation and add user to company
 * @param {string} companyId - Company ID
 * @param {string} invitationId - Invitation ID
 * @param {string} userId - User ID accepting the invitation
 * @param {string} userEmail - User email (to verify match)
 */
export const acceptInvitation = async (companyId, invitationId, userId, userEmail) => {
  try {
    // Get invitation to verify email and get role
    const invitationRef = doc(db, 'companies', companyId, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitationData = invitationDoc.data();
    
    // Verify email matches
    if (invitationData.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('Email does not match invitation');
    }
    
    // Check if invitation is still valid
    if (invitationData.status !== 'pending') {
      throw new Error('Invitation has already been accepted or cancelled');
    }
    
    // Check expiration
    if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
      throw new Error('Invitation has expired');
    }
    
    // Use batch to update invitation and create user document atomically
    const batch = writeBatch(db);
    
    // Update invitation status
    batch.update(invitationRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: userId
    });
    
    // Get company document to inherit subscription tier
    const companyRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    const companyTier = companyDoc.exists() 
      ? (companyDoc.data().subscriptionTier || 'business') // Default to business if company exists
      : (invitationData.subscriptionTier || 'business'); // Fallback to invitation or business
    
    // Create user document in company
    const userRef = doc(db, 'companies', companyId, 'users', userId);
    const roleModules = {
      owner: ['expenses', 'income', 'marketing', 'projects', 'forecasting', 'reports', 'settings', 'team'],
      manager: ['expenses', 'income', 'marketing', 'projects', 'forecasting', 'reports', 'team'],
      employee: ['expenses', 'projects'],
      accountant: ['expenses', 'income', 'reports'],
      marketingManager: ['expenses', 'income', 'invoices', 'marketing', 'projects', 'forecasting', 'reports', 'team'],
      developer: ['expenses', 'income', 'invoices', 'marketing', 'projects', 'forecasting', 'reports', 'team'],
      dataEntryClerk: ['expenses', 'income', 'invoices', 'marketing', 'projects', 'forecasting', 'reports', 'team']
    };
    
    batch.set(userRef, {
      email: userEmail,
      role: invitationData.role || 'employee',
      accessModules: roleModules[invitationData.role || 'employee'] || ['expenses'],
      subscriptionTier: companyTier, // Inherit from company, not invitation
      joinedAt: serverTimestamp(),
      invitedBy: invitationData.invitedBy
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Add an existing user directly to a company (bypassing invitation)
 * Useful for manually adding users who already have accounts
 * @param {string} companyId - Company ID
 * @param {string} userId - Firebase Auth User ID
 * @param {string} userEmail - User email
 * @param {string} role - Role to assign
 */
export const addUserDirectlyToCompany = async (companyId, userId, userEmail, role = 'employee') => {
  try {
    // Check if user already exists in company (by userId)
    const userRef = doc(db, 'companies', companyId, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      throw new Error('User is already a member of this company');
    }
    
    // Auto-cancel any pending invitations for this email since user is being added directly
    try {
      const invitationsRef = collection(db, 'companies', companyId, 'invitations');
      const inviteQuery = query(
        invitationsRef,
        where('email', '==', userEmail.toLowerCase().trim()),
        where('status', '==', 'pending')
      );
      const inviteSnapshot = await getDocs(inviteQuery);
      
      // Cancel all pending invitations for this email
      const batch = writeBatch(db);
      inviteSnapshot.forEach((inviteDoc) => {
        batch.update(doc(db, 'companies', companyId, 'invitations', inviteDoc.id), {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          cancelledReason: 'User added directly - invitation no longer needed'
        });
      });
      
      if (inviteSnapshot.docs.length > 0) {
        await batch.commit();
        console.log(`[addUserDirectlyToCompany] Auto-cancelled ${inviteSnapshot.docs.length} pending invitation(s) for ${userEmail}`);
      }
    } catch (inviteError) {
      // Don't fail user addition if invitation cancellation fails - just log it
      console.warn('[addUserDirectlyToCompany] Could not cancel pending invitations:', inviteError);
    }
    
    // Also check if another user with the same email already exists
    // This prevents duplicate entries if the same email was added with different UIDs
    const usersRef = collection(db, 'companies', companyId, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const emailToCheck = userEmail.toLowerCase().trim();
    
    let existingDuplicate = null;
    for (const existingUserDoc of usersSnapshot.docs) {
      const existingUserData = existingUserDoc.data();
      const existingEmail = (existingUserData.email || '').toLowerCase().trim();
      
      if (existingEmail === emailToCheck && existingUserDoc.id !== userId) {
        // Found duplicate - check if the existing one has wrong UID (short/invalid)
        // Firebase Auth UIDs are typically 28 characters long
        const existingUid = existingUserDoc.id;
        const isValidUid = existingUid && existingUid.length > 20 && /^[A-Za-z0-9]+$/.test(existingUid);
        
        // If existing UID looks invalid and new one is valid, auto-remove old one
        if (!isValidUid && userId && userId.length > 20) {
          console.warn(`[addUserDirectlyToCompany] Removing invalid duplicate user ${existingUid}, replacing with correct UID ${userId}`);
          try {
            const duplicateRef = doc(db, 'companies', companyId, 'users', existingUid);
            await deleteDoc(duplicateRef);
            console.log(`[addUserDirectlyToCompany] Removed duplicate user ${existingUid}`);
          } catch (deleteError) {
            console.error(`[addUserDirectlyToCompany] Could not auto-remove duplicate:`, deleteError);
            throw new Error(`A user with email ${userEmail} already exists with an invalid User ID (${existingUid}). Please remove it manually first.`);
          }
        } else {
          existingDuplicate = existingUserDoc.id;
        }
      }
    }
    
    if (existingDuplicate) {
      throw new Error(`A user with email ${userEmail} already exists in this company with User ID ${existingDuplicate}. Please remove the existing entry first.`);
    }
    
    // Set default access modules based on role
    const roleModules = {
      owner: ['expenses', 'income', 'marketing', 'forecasting', 'reports', 'settings', 'team'],
      manager: ['expenses', 'income', 'marketing', 'forecasting', 'reports'],
      employee: ['expenses'],
      accountant: ['expenses', 'income', 'reports']
    };
    
    // Create user document
    await setDoc(userRef, {
      email: userEmail,
      role: role || 'employee',
      accessModules: roleModules[role] || ['expenses'],
      subscriptionTier: 'lite',
      joinedAt: serverTimestamp(),
      addedDirectly: true
    });
    
    return userRef.id;
  } catch (error) {
    console.error('Error adding user directly to company:', error);
    throw error;
  }
};

/**
 * Find Firebase user by email (searches public user data)
 * Note: This is limited - Firebase Auth doesn't expose user emails directly
 * This function helps when you know the email matches the Firebase user
 * @param {string} email - Email to search for
 * @returns {Promise<{uid: string, email: string} | null>}
 */
export const findUserByEmail = async () => {
  try {
    // In Firebase, we can't directly query users by email from the client
    // This function is a placeholder for when we have a backend API
    // For now, we'll rely on the user providing their UID or we'll add them via invitation
    
    // In production, you would:
    // 1. Have a Cloud Function that searches users
    // 2. Or maintain a users index collection
    // 3. Or use Firebase Admin SDK on backend
    
    console.warn('findUserByEmail: Direct email search not available from client. Use invitation system instead.');
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

// ==================== VENDOR PROFILES ====================

const normalizeVendorNameForLookup = (value = '') => {
  return value
    ?.toString()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '';
};

const normalizeInvoiceNumberForLookup = (value = '') => {
  return value
    ?.toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim() || '';
};

const normalizeVatNumberForLookup = (value = '') => {
  return value
    ?.toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim() || '';
};

const extractVendorSearchTokens = (value = '') => {
  const normalized = normalizeVendorNameForLookup(value);
  if (!normalized) return [];
  const rawTokens = normalized.split(' ');
  const filtered = rawTokens.filter((token) => token && token.length > 1);
  return Array.from(new Set(filtered));
};

const createVendorDocumentId = (name = '', invoiceNumber = '') => {
  const normalizedName = normalizeVendorNameForLookup(name);
  let slug = normalizedName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  if (!slug && invoiceNumber) {
    const normalizedInvoice = normalizeInvoiceNumberForLookup(invoiceNumber);
    if (normalizedInvoice) {
      slug = `invoice-${normalizedInvoice.toLowerCase()}`;
    }
  }

  if (!slug) {
    slug = `vendor-${Date.now()}`;
  }

  return slug.slice(0, 120);
};

const addArrayUnionValues = (target, key, values = []) => {
  if (!target || !key) return;
  const cleaned = Array.from(
    new Set(
      (values || [])
        .map((value) => (typeof value === 'string' ? value.trim() : value))
        .filter(Boolean)
    )
  );
  if (cleaned.length > 0) {
    target[key] = arrayUnion(...cleaned);
  }
};

/**
 * Subscribe to vendor profiles for a company
 * @param {string} companyId - Company ID
 * @param {(vendors: Array) => void} callback - Callback with vendor profiles
 * @returns {() => void} Unsubscribe function
 */
export const subscribeToCompanyVendors = (companyId, callback) => {
  if (!companyId) {
    console.warn('[subscribeToCompanyVendors] companyId is required');
    callback?.([]);
    return () => {};
  }

  const vendorsRef = collection(db, 'companies', companyId, 'vendors');

  return onSnapshot(
    vendorsRef,
    (snapshot) => {
      const vendors = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));
      callback?.(vendors);
    },
    (error) => {
      console.error('[subscribeToCompanyVendors] Failed to subscribe:', error);
      callback?.([]);
    }
  );
};

/**
 * Create or update a vendor profile based on expense data
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID performing the update
 * @param {object} vendorData - Vendor data to merge
 * @returns {Promise<string | null>} Vendor document ID or null when skipped
 */
export const upsertCompanyVendorProfile = async (companyId, userId, vendorData = {}) => {
  try {
    if (!companyId) {
      throw new Error('Company ID is required to upsert vendor profiles.');
    }

    const rawName = (vendorData.name || vendorData.vendor || '').toString().trim();
    const rawInvoiceNumber = (vendorData.invoiceNumber || '').toString().trim();

    if (!rawName && !rawInvoiceNumber) {
      console.warn('[upsertCompanyVendorProfile] Skipping vendor save: no name or invoice number provided.');
      return null;
    }

    const normalizedName = normalizeVendorNameForLookup(rawName);
    const normalizedInvoice = normalizeInvoiceNumberForLookup(rawInvoiceNumber);
    const docId = createVendorDocumentId(rawName, rawInvoiceNumber);
    const vendorRef = doc(db, 'companies', companyId, 'vendors', docId);
    const vendorSnapshot = await getDoc(vendorRef);
    const isNewVendor = !vendorSnapshot.exists();

    const trimmedAddress = (vendorData.address || vendorData.vendorAddress || '')
      .toString()
      .replace(/\s{2,}/g, ' ')
      .trim();
    const vendorCountry = (vendorData.country || vendorData.vendorCountry || '').toString().trim();
    const currency = (vendorData.currency || '').toString().trim().toUpperCase();
    const paymentMethod = (vendorData.paymentMethod || '').toString().trim();
    const paymentMethodDetails = (vendorData.paymentMethodDetails || '').toString().trim();
    const vatNumber = normalizeVatNumberForLookup(vendorData.vatNumber || vendorData.vat || '');
    const chamberNumber = (vendorData.chamberOfCommerceNumber || vendorData.cocNumber || '')
      .toString()
      .replace(/\s+/g, '')
      .trim();

    const updatePayload = {
      name: rawName || rawInvoiceNumber || vendorSnapshot.data()?.name || 'Unknown Vendor',
      normalizedName,
      displayName: rawName || vendorSnapshot.data()?.displayName || rawInvoiceNumber || 'Service Provider',
      lastUsedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      usageCount: increment(1)
    };

    if (userId) {
      updatePayload.updatedBy = userId;
    }

    if (isNewVendor) {
      updatePayload.createdAt = serverTimestamp();
      if (userId) {
        updatePayload.createdBy = userId;
      }
    }

    if (normalizedName) {
      updatePayload.normalizedName = normalizedName;
      addArrayUnionValues(updatePayload, 'searchTokens', [
        ...extractVendorSearchTokens(rawName),
        normalizedName
      ]);
    }

    if (rawName && rawName !== vendorSnapshot.data()?.name) {
      addArrayUnionValues(updatePayload, 'nameHistory', [rawName]);
    }

    if (trimmedAddress) {
      updatePayload.primaryAddress = trimmedAddress;
      addArrayUnionValues(updatePayload, 'addresses', [trimmedAddress]);
    }

    if (vendorCountry) {
      updatePayload.country = vendorCountry;
      addArrayUnionValues(updatePayload, 'countries', [vendorCountry]);
    }

    if (currency) {
      addArrayUnionValues(updatePayload, 'currencies', [currency]);
      updatePayload.preferredCurrency = currency;
    }

    if (paymentMethod) {
      updatePayload.defaultPaymentMethod = paymentMethod;
      addArrayUnionValues(updatePayload, 'paymentMethods', [paymentMethod]);
    }

    if (paymentMethodDetails) {
      updatePayload.defaultPaymentMethodDetails = paymentMethodDetails;
    }

    if (vatNumber) {
      addArrayUnionValues(updatePayload, 'vatNumbers', [vatNumber]);
      updatePayload.primaryVatNumber = vatNumber;
    }

    if (chamberNumber) {
      addArrayUnionValues(updatePayload, 'chamberNumbers', [chamberNumber]);
      updatePayload.primaryChamberOfCommerceNumber = chamberNumber;
    }

    if (normalizedInvoice) {
      updatePayload.lastInvoiceNumber = normalizedInvoice;
      addArrayUnionValues(updatePayload, 'invoiceNumbers', [normalizedInvoice]);
    }

    if (vendorData.invoiceDate) {
      updatePayload.lastInvoiceDate = vendorData.invoiceDate;
    }

    if (vendorData.dueDate) {
      updatePayload.lastDueDate = vendorData.dueDate;
    }

    if (vendorData.paymentStatus) {
      updatePayload.lastPaymentStatus = vendorData.paymentStatus;
    }

    if (vendorData.documentType) {
      updatePayload.lastDocumentType = vendorData.documentType;
    }

    if (typeof vendorData.amount === 'number' && Number.isFinite(vendorData.amount)) {
      updatePayload.lastAmount = vendorData.amount;
    }

    if (vendorData.notes && vendorData.notes.trim()) {
      updatePayload.lastNotes = vendorData.notes.trim();
    }

    if (vendorData.source) {
      updatePayload.lastSource = vendorData.source;
    }

    if (vendorData.matchedProfileId) {
      updatePayload.lastMatchedProfileId = vendorData.matchedProfileId;
    }

    if (vendorData.additionalEmails) {
      addArrayUnionValues(updatePayload, 'emailContacts', vendorData.additionalEmails);
    }

    await setDoc(vendorRef, updatePayload, { merge: true });
    return docId;
  } catch (error) {
    console.error('Error upserting vendor profile:', error);
    return null;
  }
};

// ==================== LEDGER & DOUBLE-ENTRY ACCOUNTING ====================

const LEDGER_TYPE_META = {
  asset: { normalBalance: 'debit', codeBase: 1000 },
  liability: { normalBalance: 'credit', codeBase: 2000 },
  equity: { normalBalance: 'credit', codeBase: 3000 },
  revenue: { normalBalance: 'credit', codeBase: 4000 },
  expense: { normalBalance: 'debit', codeBase: 5000 },
  cogs: { normalBalance: 'debit', codeBase: 6000 }
};

const SYSTEM_LEDGER_ACCOUNT_IDS = {
  cash: '1000',
  accountsReceivable: '1100',
  accountsPayable: '2100',
  openingBalanceEquity: '3100',
  revenue: '4000',
  operatingExpenses: '5000',
  cogs: '6000'
};

const DEFAULT_LEDGER_ACCOUNTS = [
  {
    id: SYSTEM_LEDGER_ACCOUNT_IDS.cash,
    code: '1000',
    name: 'Cash & Cash Equivalents',
    type: 'asset',
    normalBalance: 'debit',
    description: 'System default for immediate cash and bank balances',
    currency: 'EUR',
    isSystem: true
  },
  {
    id: SYSTEM_LEDGER_ACCOUNT_IDS.accountsReceivable,
    code: '1100',
    name: 'Accounts Receivable',
    type: 'asset',
    normalBalance: 'debit',
    description: 'System default for outstanding customer invoices',
    currency: 'EUR',
    isSystem: true
  },
  {
    id: SYSTEM_LEDGER_ACCOUNT_IDS.accountsPayable,
    code: '2100',
    name: 'Accounts Payable',
    type: 'liability',
    normalBalance: 'credit',
    description: 'System default for unpaid supplier invoices',
    currency: 'EUR',
    isSystem: true
  },
  {
    id: SYSTEM_LEDGER_ACCOUNT_IDS.openingBalanceEquity,
    code: '3100',
    name: 'Opening Balance Equity',
    type: 'equity',
    normalBalance: 'credit',
    description: 'System default for opening balance offsets',
    currency: 'EUR',
    isSystem: true
  },
  {
    id: SYSTEM_LEDGER_ACCOUNT_IDS.revenue,
    code: '4000',
    name: 'Operating Revenue',
    type: 'revenue',
    normalBalance: 'credit',
    description: 'System default for earned revenue',
    currency: 'EUR',
    isSystem: true
  },
  {
    id: SYSTEM_LEDGER_ACCOUNT_IDS.operatingExpenses,
    code: '5000',
    name: 'Operating Expenses',
    type: 'expense',
    normalBalance: 'debit',
    description: 'System default for general operating expenses',
    currency: 'EUR',
    isSystem: true
  },
  {
    id: SYSTEM_LEDGER_ACCOUNT_IDS.cogs,
    code: '6000',
    name: 'Cost of Goods Sold',
    type: 'cogs',
    normalBalance: 'debit',
    description: 'System default for direct costs of delivered products/services',
    currency: 'EUR',
    isSystem: true
  }
];

const getLedgerAccountsCollection = (companyId) => collection(db, 'companies', companyId, 'ledgerAccounts');
const getLedgerAccountRef = (companyId, accountId) => doc(db, 'companies', companyId, 'ledgerAccounts', accountId);
const getLedgerEntriesCollection = (companyId) => collection(db, 'companies', companyId, 'ledgerEntries');
const getLedgerEntryRef = (companyId, entryId) => doc(db, 'companies', companyId, 'ledgerEntries', entryId);
const getLedgerMappingsRef = (companyId) => doc(db, 'companies', companyId, 'settings', 'ledgerMappings');

const ensureDefaultLedgerAccounts = async (companyId) => {
  if (!companyId) {
    return;
  }

  const ledgerAccountsRef = getLedgerAccountsCollection(companyId);
  await Promise.all(
    DEFAULT_LEDGER_ACCOUNTS.map(async (account) => {
      const accountRef = doc(ledgerAccountsRef, account.id);
      const snapshot = await getDoc(accountRef);
      if (!snapshot.exists()) {
        await setDoc(accountRef, {
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          description: account.description || '',
          currency: account.currency || 'EUR',
          balance: 0,
          debitTotal: 0,
          creditTotal: 0,
          isSystem: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    })
  );
};

const generateLedgerAccountCode = async (companyId, type = 'expense') => {
  const meta = LEDGER_TYPE_META[type] || LEDGER_TYPE_META.expense;
  const codeBase = meta.codeBase || 5000;
  const ledgerAccountsRef = getLedgerAccountsCollection(companyId);
  const q = query(
    ledgerAccountsRef,
    where('type', '==', type),
    orderBy('code', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const latestCode = snapshot.docs[0].data().code;
    const numeric = parseInt(latestCode, 10);
    if (!Number.isNaN(numeric)) {
      return String(numeric + 1);
    }
  }

  const minimum = codeBase + 100;
  return String(minimum);
};

const normalizeLedgerLine = (line = {}) => {
  const debit = Number.isFinite(parseFloat(line.debit)) ? parseFloat(parseFloat(line.debit).toFixed(2)) : 0;
  const credit = Number.isFinite(parseFloat(line.credit)) ? parseFloat(parseFloat(line.credit).toFixed(2)) : 0;
  return {
    accountId: line.accountId,
    accountCode: line.accountCode || '',
    accountName: line.accountName || '',
    debit,
    credit,
    currency: line.currency || 'EUR',
    type: line.type || '',
    financialAccountId: line.financialAccountId || '',
    metadata: line.metadata || {}
  };
};

const computeLedgerAdjustments = (lines = [], multiplier = 1) => {
  const adjustments = new Map();
  lines.forEach((line) => {
    if (!line.accountId) {
      return;
    }
    const debit = Number.isFinite(line.debit) ? line.debit * multiplier : 0;
    const credit = Number.isFinite(line.credit) ? line.credit * multiplier : 0;
    if (!adjustments.has(line.accountId)) {
      adjustments.set(line.accountId, { debit: 0, credit: 0 });
    }
    const bucket = adjustments.get(line.accountId);
    bucket.debit += debit;
    bucket.credit += credit;
  });
  return adjustments;
};

const computeFinancialAccountAdjustments = (lines = [], multiplier = 1) => {
  const adjustments = new Map();
  lines.forEach((line) => {
    if (!line.financialAccountId) {
      return;
    }
    const debit = Number.isFinite(line.debit) ? line.debit : 0;
    const credit = Number.isFinite(line.credit) ? line.credit : 0;
    const delta = (debit - credit) * multiplier;
    if (Math.abs(delta) < 0.0001) {
      return;
    }
    if (!adjustments.has(line.financialAccountId)) {
      adjustments.set(line.financialAccountId, 0);
    }
    adjustments.set(line.financialAccountId, adjustments.get(line.financialAccountId) + delta);
  });
  return adjustments;
};

const addLedgerAccountRecord = async (companyId, accountData = {}) => {
  await ensureDefaultLedgerAccounts(companyId);
  const ledgerAccountsRef = getLedgerAccountsCollection(companyId);
  const meta = LEDGER_TYPE_META[accountData.type] || LEDGER_TYPE_META.expense;

  const payload = {
    name: accountData.name?.trim() || 'Unnamed Ledger Account',
    type: accountData.type || 'expense',
    code: accountData.code || await generateLedgerAccountCode(companyId, accountData.type || 'expense'),
    normalBalance: accountData.normalBalance || meta.normalBalance || 'debit',
    description: accountData.description?.trim() || '',
    currency: accountData.currency || 'EUR',
    balance: parseFloat(accountData.balance || 0),
    debitTotal: parseFloat(accountData.debitTotal || 0),
    creditTotal: parseFloat(accountData.creditTotal || 0),
    isSystem: accountData.isSystem ?? false,
    isActive: accountData.isActive ?? true,
    linkedFinancialAccountId: accountData.linkedFinancialAccountId || '',
    category: accountData.category || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (accountData.id) {
    const accountRef = doc(ledgerAccountsRef, accountData.id);
    await setDoc(accountRef, payload, { merge: true });
    return accountRef.id;
  }

  const docRef = await addDoc(ledgerAccountsRef, payload);
  return docRef.id;
};

const updateLedgerAccountRecord = async (companyId, accountId, accountData = {}) => {
  if (!companyId || !accountId) {
    return;
  }
  const accountRef = getLedgerAccountRef(companyId, accountId);
  const payload = {
    ...accountData,
    updatedAt: serverTimestamp()
  };
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });
  await updateDoc(accountRef, payload);
};

const ensureLedgerAccountForFinancialAccount = async (companyId, financialAccountId) => {
  if (!companyId || !financialAccountId) {
    return null;
  }

  const accountRef = doc(db, 'companies', companyId, 'financialAccounts', financialAccountId);
  const accountSnap = await getDoc(accountRef);
  if (!accountSnap.exists()) {
    return null;
  }

  const accountData = accountSnap.data();
  if (accountData.ledgerAccountId) {
    return accountData.ledgerAccountId;
  }

  const ledgerAccountId = await addLedgerAccountRecord(companyId, {
    name: accountData.name ? `Bank • ${accountData.name}` : 'Bank Account',
    type: 'asset',
    description: accountData.bankName
      ? `${accountData.bankName}${accountData.accountNumber ? ` • ${accountData.accountNumber}` : ''}`
      : 'Linked financial account',
    currency: accountData.currency || 'EUR',
    linkedFinancialAccountId: financialAccountId
  });

  await updateDoc(accountRef, {
    ledgerAccountId,
    updatedAt: serverTimestamp()
  });

  return ledgerAccountId;
};

const getOrCreateExpenseLedgerAccount = async (companyId, category = 'Operating Expenses', currency = 'EUR') => {
  await ensureDefaultLedgerAccounts(companyId);
  const categoryKey = category.trim().toLowerCase();
  const mappingsRef = getLedgerMappingsRef(companyId);
  const mappingsSnap = await getDoc(mappingsRef);
  const mappingsData = mappingsSnap.exists() ? mappingsSnap.data() : {};
  const expenseMappings = mappingsData.expenseCategories || {};

  if (expenseMappings[categoryKey]) {
    return expenseMappings[categoryKey];
  }

  const ledgerAccountId = await addLedgerAccountRecord(companyId, {
    name: `Expense • ${category}`,
    type: 'expense',
    currency,
    category: categoryKey,
    description: `Auto-created expense ledger account for category "${category}"`
  });

  await setDoc(mappingsRef, {
    expenseCategories: {
      ...expenseMappings,
      [categoryKey]: ledgerAccountId
    },
    updatedAt: serverTimestamp()
  }, { merge: true });

  return ledgerAccountId;
};

const getOrCreateRevenueLedgerAccount = async (companyId, category = 'Operating Revenue', currency = 'EUR') => {
  await ensureDefaultLedgerAccounts(companyId);
  const categoryKey = category.trim().toLowerCase();
  const mappingsRef = getLedgerMappingsRef(companyId);
  const mappingsSnap = await getDoc(mappingsRef);
  const mappingsData = mappingsSnap.exists() ? mappingsSnap.data() : {};
  const incomeMappings = mappingsData.incomeCategories || {};

  if (incomeMappings[categoryKey]) {
    return incomeMappings[categoryKey];
  }

  const ledgerAccountId = await addLedgerAccountRecord(companyId, {
    name: `Revenue • ${category}`,
    type: 'revenue',
    currency,
    category: categoryKey,
    description: `Auto-created revenue ledger account for category "${category}"`
  });

  await setDoc(mappingsRef, {
    incomeCategories: {
      ...incomeMappings,
      [categoryKey]: ledgerAccountId
    },
    updatedAt: serverTimestamp()
  }, { merge: true });

  return ledgerAccountId;
};

const createLedgerEntry = async (companyId, entryData = {}) => {
  if (!companyId) {
    throw new Error('Company ID is required for ledger entries');
  }

  const rawLines = Array.isArray(entryData.lines) ? entryData.lines : [];
  if (rawLines.length === 0) {
    throw new Error('Ledger entry requires at least one line item');
  }

  const lines = rawLines.map(normalizeLedgerLine);
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.02) {
    throw new Error('Ledger entry must balance (total debits = total credits)');
  }

  await ensureDefaultLedgerAccounts(companyId);

  const ledgerEntriesRef = getLedgerEntriesCollection(companyId);
  const entryRef = doc(ledgerEntriesRef);
  const ledgerAdjustments = computeLedgerAdjustments(lines, 1);
  const financialAdjustments = computeFinancialAccountAdjustments(lines, 1);

  await runTransaction(db, async (transaction) => {
    // PHASE 1: ALL READS FIRST (Firestore requirement)
    // Read all ledger accounts that will be updated
    const ledgerAccountSnaps = new Map();
    for (const [accountId] of ledgerAdjustments.entries()) {
      const accountRef = getLedgerAccountRef(companyId, accountId);
      const accountSnap = await transaction.get(accountRef);
      if (!accountSnap.exists()) {
        throw new Error(`Ledger account ${accountId} not found`);
      }
      ledgerAccountSnaps.set(accountId, accountSnap);
    }
    
    // Read all financial accounts that will be updated
    const financialAccountSnaps = new Map();
    for (const [financialAccountId] of financialAdjustments.entries()) {
      const financialRef = doc(db, 'companies', companyId, 'financialAccounts', financialAccountId);
      const financialSnap = await transaction.get(financialRef);
      if (financialSnap.exists()) {
        financialAccountSnaps.set(financialAccountId, financialSnap);
      }
    }
    
    // PHASE 2: ALL WRITES AFTER READS
    // Create the ledger entry
    transaction.set(entryRef, {
      date: entryData.date || new Date().toISOString().split('T')[0],
      description: entryData.description || '',
      lines,
      totalDebit: parseFloat(totalDebit.toFixed(2)),
      totalCredit: parseFloat(totalCredit.toFixed(2)),
      sourceId: entryData.sourceId || '',
      sourceType: entryData.sourceType || '',
      createdBy: entryData.createdBy || '',
      metadata: entryData.metadata || {},
      currency: entryData.currency || lines[0]?.currency || 'EUR',
      isReversal: entryData.isReversal || false,
      reversesEntryId: entryData.reversesEntryId || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update ledger accounts (using data from reads)
    for (const [accountId, adjustment] of ledgerAdjustments.entries()) {
      const accountSnap = ledgerAccountSnaps.get(accountId);
      const accountData = accountSnap.data();
      const meta = LEDGER_TYPE_META[accountData.type] || {};
      const normalBalance = accountData.normalBalance || meta.normalBalance || 'debit';
      const currentBalance = parseFloat(accountData.balance || 0);
      const currentDebit = parseFloat(accountData.debitTotal || 0);
      const currentCredit = parseFloat(accountData.creditTotal || 0);

      const balanceDelta = normalBalance === 'debit'
        ? adjustment.debit - adjustment.credit
        : adjustment.credit - adjustment.debit;

      const accountRef = getLedgerAccountRef(companyId, accountId);
      transaction.update(accountRef, {
        balance: parseFloat((currentBalance + balanceDelta).toFixed(2)),
        debitTotal: parseFloat((currentDebit + adjustment.debit).toFixed(2)),
        creditTotal: parseFloat((currentCredit + adjustment.credit).toFixed(2)),
        updatedAt: serverTimestamp()
      });
    }

    // Update financial accounts (using data from reads)
    for (const [financialAccountId, delta] of financialAdjustments.entries()) {
      const financialSnap = financialAccountSnaps.get(financialAccountId);
      if (!financialSnap) {
        continue; // Skip if account doesn't exist
      }
      const currentBalance = parseFloat(financialSnap.data().currentBalance || 0);
      const financialRef = doc(db, 'companies', companyId, 'financialAccounts', financialAccountId);
      transaction.update(financialRef, {
        currentBalance: parseFloat((currentBalance + delta).toFixed(2)),
        updatedAt: serverTimestamp()
      });
    }
  });

  return entryRef.id;
};

const reverseLedgerEntry = async (companyId, entryId, userId = '', reason = '') => {
  if (!companyId || !entryId) {
    return null;
  }

  const entryRef = getLedgerEntryRef(companyId, entryId);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) {
    return null;
  }

  const entryData = entrySnap.data();
  if (entryData.reversed) {
    return entryData.reversalEntryId || null;
  }

  const reversalLines = (entryData.lines || []).map((line) => normalizeLedgerLine({
    ...line,
    debit: line.credit,
    credit: line.debit
  }));

  const reversalEntryId = await createLedgerEntry(companyId, {
    date: entryData.date,
    description: `Reversal: ${entryData.description || 'Ledger Entry'} (${entryId})`,
    lines: reversalLines,
    sourceType: 'ledger_reversal',
    sourceId: entryId,
    createdBy: userId || entryData.createdBy || '',
    metadata: {
      ...(entryData.metadata || {}),
      reversalReason: reason || 'Adjusted by system'
    },
    currency: entryData.currency || 'EUR',
    isReversal: true,
    reversesEntryId: entryId
  });

  await updateDoc(entryRef, {
    reversed: true,
    reversalEntryId,
    reversedAt: serverTimestamp(),
    reversalReason: reason || ''
  });

  return reversalEntryId;
};

const createExpenseLedgerEntry = async (companyId, expenseId, expenseData = {}, userId = '') => {
  const amountValue = parseFloat(expenseData.amount || 0);
  if (!companyId || !Number.isFinite(amountValue) || amountValue === 0) {
    return null;
  }

  const currency = expenseData.currency || (expenseData.conversionMeta?.baseCurrency) || 'EUR';
  const category = expenseData.category || 'Operating Expenses';
  const expenseLedgerAccountId = await getOrCreateExpenseLedgerAccount(companyId, category, currency);

  let creditLedgerAccountId = null;
  let financialAccountIdForLine = '';

  const isPaid = (expenseData.paymentStatus || '').toLowerCase() === 'paid';
  if (isPaid && expenseData.financialAccountId) {
    creditLedgerAccountId = await ensureLedgerAccountForFinancialAccount(companyId, expenseData.financialAccountId);
    financialAccountIdForLine = expenseData.financialAccountId;
  }

  if (!creditLedgerAccountId) {
    creditLedgerAccountId = SYSTEM_LEDGER_ACCOUNT_IDS.accountsPayable;
  }

  const lines = [
    {
      accountId: expenseLedgerAccountId,
      debit: amountValue,
      credit: 0,
      currency,
      type: 'expense',
      metadata: {
        category,
        vendor: expenseData.vendor || '',
        invoiceNumber: expenseData.invoiceNumber || ''
      }
    },
    {
      accountId: creditLedgerAccountId,
      debit: 0,
      credit: amountValue,
      currency,
      type: financialAccountIdForLine ? 'asset' : 'liability',
      financialAccountId: financialAccountIdForLine || '',
      metadata: {
        vendor: expenseData.vendor || '',
        isAccrual: !financialAccountIdForLine
      }
    }
  ].map(normalizeLedgerLine);

  const entryId = await createLedgerEntry(companyId, {
    date: expenseData.invoiceDate || expenseData.date || new Date().toISOString().split('T')[0],
    description: expenseData.description || `Expense: ${expenseData.vendor || category}`,
    lines,
    sourceId: expenseId || '',
    sourceType: 'expense',
    createdBy: userId || expenseData.createdBy || '',
    currency,
    metadata: {
      vendor: expenseData.vendor || '',
      category,
      documentType: expenseData.documentType || '',
      paymentStatus: expenseData.paymentStatus || '',
      financialAccountId: expenseData.financialAccountId || ''
    }
  });

  return entryId;
};

const createIncomeLedgerEntry = async (companyId, incomeId, incomeData = {}, userId = '') => {
  const amountValue = parseFloat(incomeData.amount || 0);
  if (!companyId || !Number.isFinite(amountValue) || amountValue === 0) {
    return null;
  }

  const currency = incomeData.currency || 'EUR';
  const category = incomeData.category || 'Operating Revenue';
  const revenueLedgerAccountId = await getOrCreateRevenueLedgerAccount(companyId, category, currency);

  let debitLedgerAccountId;
  let financialAccountIdForLine = '';

  if (incomeData.financialAccountId) {
    debitLedgerAccountId = await ensureLedgerAccountForFinancialAccount(companyId, incomeData.financialAccountId);
    financialAccountIdForLine = incomeData.financialAccountId;
  } else {
    debitLedgerAccountId = SYSTEM_LEDGER_ACCOUNT_IDS.accountsReceivable;
  }

  const lines = [
    {
      accountId: debitLedgerAccountId,
      debit: amountValue,
      credit: 0,
      currency,
      type: financialAccountIdForLine ? 'asset' : 'receivable',
      financialAccountId: financialAccountIdForLine || '',
      metadata: {
        customer: incomeData.customer || '',
        reference: incomeData.invoiceId || incomeData.transactionId || ''
      }
    },
    {
      accountId: revenueLedgerAccountId,
      debit: 0,
      credit: amountValue,
      currency,
      type: 'revenue',
      metadata: {
        category,
        customer: incomeData.customer || ''
      }
    }
  ].map(normalizeLedgerLine);

  const entryId = await createLedgerEntry(companyId, {
    date: incomeData.date || new Date().toISOString().split('T')[0],
    description: incomeData.description || `Income: ${incomeData.customer || category}`,
    lines,
    sourceId: incomeId || '',
    sourceType: 'income',
    createdBy: userId || incomeData.createdBy || '',
    currency,
    metadata: {
      customer: incomeData.customer || '',
      category,
      financialAccountId: incomeData.financialAccountId || '',
      invoiceId: incomeData.invoiceId || '',
      transactionId: incomeData.transactionId || ''
    }
  });

  return entryId;
};

export const getCompanyLedgerAccounts = async (companyId) => {
  if (!companyId) {
    return [];
  }

  await ensureDefaultLedgerAccounts(companyId);

  const accountsRef = getLedgerAccountsCollection(companyId);
  const q = query(accountsRef, orderBy('code'));
  const snapshot = await getDocs(q);

  const accounts = [];
  snapshot.forEach((docSnap) => {
    accounts.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  return accounts;
};

export const addCompanyLedgerAccount = async (companyId, accountData = {}) => {
  if (!companyId) {
    throw new Error('Company ID is required to add ledger accounts');
  }

  return await addLedgerAccountRecord(companyId, accountData);
};

export const updateCompanyLedgerAccount = async (companyId, accountId, accountData = {}) => {
  if (!companyId || !accountId) {
    throw new Error('Company ID and account ID are required to update ledger accounts');
  }

  await updateLedgerAccountRecord(companyId, accountId, accountData);
};

export const archiveCompanyLedgerAccount = async (companyId, accountId, options = {}) => {
  if (!companyId || !accountId) {
    throw new Error('Company ID and account ID are required to archive ledger accounts');
  }

  await updateLedgerAccountRecord(companyId, accountId, {
    isActive: false,
    archivedAt: serverTimestamp(),
    archivedBy: options.archivedBy || '',
    archiveReason: options.reason || ''
  });
};

export const getCompanyLedgerEntries = async (companyId, options = {}) => {
  if (!companyId) {
    return [];
  }

  const { limitCount = 100, startDate, endDate } = options;
  const ledgerEntriesRef = getLedgerEntriesCollection(companyId);

  const constraints = [];
  if (startDate) {
    constraints.push(where('date', '>=', startDate));
  }

  if (endDate) {
    constraints.push(where('date', '<=', endDate));
  }

  constraints.push(orderBy('date', 'desc'));
  constraints.push(limit(limitCount));

  const q = query(ledgerEntriesRef, ...constraints);
  const snapshot = await getDocs(q);

  const entries = [];
  snapshot.forEach((docSnap) => {
    entries.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  return entries;
};

export const backfillCompanyLedger = async (companyId, options = {}) => {
  if (!companyId) {
    throw new Error('Company ID is required for ledger backfill');
  }

  const {
    includeExpenses = true,
    includeIncome = true
  } = options;

  const result = {
    expensesProcessed: 0,
    expensesBackfilled: 0,
    incomeProcessed: 0,
    incomeBackfilled: 0,
    errors: []
  };

  const sensitiveFields = ['amount', 'vatNumber', 'bankAccount', 'invoiceNumber'];

  if (includeExpenses) {
    try {
      const expensesRef = collection(db, 'companies', companyId, 'expenses');
      const snapshot = await getDocs(expensesRef);

      for (const docSnap of snapshot.docs) {
        result.expensesProcessed += 1;
        const data = docSnap.data();
        if (data.ledgerEntryId) {
          continue;
        }

        try {
          const decrypted = await decryptSensitiveFields(data, sensitiveFields);
          const ledgerEntryId = await createExpenseLedgerEntry(
            companyId,
            docSnap.id,
            decrypted,
            decrypted.updatedBy || decrypted.createdBy || ''
          );

          if (ledgerEntryId) {
            await updateDoc(docSnap.ref, {
              ledgerEntryId,
              updatedAt: serverTimestamp()
            });
            result.expensesBackfilled += 1;
          }
        } catch (expenseError) {
          console.error('Failed to backfill ledger for expense:', docSnap.id, expenseError);
          result.errors.push({
            type: 'expense',
            id: docSnap.id,
            message: expenseError.message
          });
        }
      }
    } catch (expenseFetchError) {
      console.error('Failed to fetch expenses during ledger backfill:', expenseFetchError);
      result.errors.push({
        type: 'expense',
        id: null,
        message: expenseFetchError.message
      });
    }
  }

  if (includeIncome) {
    try {
      const incomeRef = collection(db, 'companies', companyId, 'income');
      const snapshot = await getDocs(incomeRef);

      for (const docSnap of snapshot.docs) {
        result.incomeProcessed += 1;
        const data = docSnap.data();
        if (data.ledgerEntryId) {
          continue;
        }

        try {
          const ledgerEntryId = await createIncomeLedgerEntry(
            companyId,
            docSnap.id,
            data,
            data.updatedBy || data.createdBy || ''
          );

          if (ledgerEntryId) {
            await updateDoc(docSnap.ref, {
              ledgerEntryId,
              updatedAt: serverTimestamp()
            });
            result.incomeBackfilled += 1;
          }
        } catch (incomeError) {
          console.error('Failed to backfill ledger for income:', docSnap.id, incomeError);
          result.errors.push({
            type: 'income',
            id: docSnap.id,
            message: incomeError.message
          });
        }
      }
    } catch (incomeFetchError) {
      console.error('Failed to fetch income during ledger backfill:', incomeFetchError);
      result.errors.push({
        type: 'income',
        id: null,
        message: incomeFetchError.message
      });
    }
  }

  return result;
};

// ==================== FINANCIAL ACCOUNTS ====================

/**
 * Get all financial accounts for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of financial account objects
 */
export const getCompanyFinancialAccounts = async (companyId) => {
  try {
    const accountsRef = collection(db, 'companies', companyId, 'financialAccounts');
    const accountsSnapshot = await getDocs(accountsRef);
    
    const accounts = [];
    accountsSnapshot.forEach((doc) => {
      accounts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by name for consistent display
    return accounts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (error) {
    console.error('Error getting company financial accounts:', error);
    throw error;
  }
};

/**
 * Add a financial account to a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID (for audit)
 * @param {object} accountData - Account data
 * @returns {Promise<string>} Account document ID
 */
export const addFinancialAccount = async (companyId, userId, accountData) => {
  try {
    const accountsRef = collection(db, 'companies', companyId, 'financialAccounts');
    const docRef = await addDoc(accountsRef, {
      name: accountData.name?.trim() || '',
      type: accountData.type || 'bank',
      currency: accountData.currency || 'EUR',
      initialBalance: parseFloat(accountData.initialBalance || 0),
      currentBalance: parseFloat(accountData.initialBalance || 0), // Start with initial balance
      linkedTo: accountData.linkedTo || [],
      description: accountData.description?.trim() || '',
      
      // Bank Account Details
      bankName: accountData.bankName?.trim() || '',
      accountNumber: accountData.accountNumber?.trim() || '',
      iban: accountData.iban?.trim() || '',
      swift: accountData.swift?.trim() || '',
      
      // Card Details
      cardLastFour: accountData.cardLastFour?.trim() || '',
      cardType: accountData.cardType || '',
      cardHolderName: accountData.cardHolderName?.trim() || '',
      expiryDate: accountData.expiryDate?.trim() || '',
      
      // Metadata
      isActive: accountData.isActive !== undefined ? accountData.isActive : true,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    try {
      const ledgerAccountId = await ensureLedgerAccountForFinancialAccount(companyId, docRef.id);
      const initialBalance = parseFloat(accountData.initialBalance || 0);
      const currency = accountData.currency || 'EUR';

      if (ledgerAccountId && Number.isFinite(initialBalance) && initialBalance !== 0) {
        const amount = Math.abs(initialBalance);
        const isPositive = initialBalance >= 0;

        const lines = [
          {
            accountId: isPositive ? ledgerAccountId : SYSTEM_LEDGER_ACCOUNT_IDS.openingBalanceEquity,
            debit: amount,
            credit: 0,
            currency,
            type: isPositive ? 'asset' : 'equity',
            financialAccountId: isPositive ? docRef.id : '',
            metadata: {
              openingBalance: true,
              financialAccountId: docRef.id
            }
          },
          {
            accountId: isPositive ? SYSTEM_LEDGER_ACCOUNT_IDS.openingBalanceEquity : ledgerAccountId,
            debit: 0,
            credit: amount,
            currency,
            type: isPositive ? 'equity' : 'asset',
            financialAccountId: !isPositive ? docRef.id : '',
            metadata: {
              openingBalance: true,
              financialAccountId: docRef.id
            }
          }
        ];

        await createLedgerEntry(companyId, {
          date: new Date().toISOString().split('T')[0],
          description: `Opening balance • ${accountData.name || 'Financial Account'}`,
          lines,
          sourceId: docRef.id,
          sourceType: 'financial_account_opening',
          createdBy: userId,
          currency,
          metadata: {
            accountType: accountData.type || 'bank'
          }
        });
      }
    } catch (ledgerError) {
      console.error('Error linking financial account to ledger:', ledgerError);
    }

    return docRef.id;
  } catch (error) {
    console.error('Error adding financial account:', error);
    throw error;
  }
};

/**
 * Update a financial account
 * @param {string} companyId - Company ID
 * @param {string} accountId - Account ID
 * @param {object} accountData - Updated account data
 */
export const updateFinancialAccount = async (companyId, accountId, accountData) => {
  try {
    const accountRef = doc(db, 'companies', companyId, 'financialAccounts', accountId);
    const existingSnapshot = await getDoc(accountRef);
    const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
    
    const updateData = {
      ...accountData,
      updatedAt: serverTimestamp()
    };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(accountRef, updateData);

    const ledgerAccountId = updateData.ledgerAccountId || existingData.ledgerAccountId;
    if (ledgerAccountId) {
      const ledgerUpdate = {};

      if (accountData.name) {
        const prefix = (accountData.type || existingData.type || 'bank') === 'credit_card'
          ? 'Card'
          : (accountData.type || existingData.type || 'bank') === 'loan'
            ? 'Loan'
            : 'Bank';
        ledgerUpdate.name = `${prefix} • ${accountData.name}`;
      }

      if (accountData.currency) {
        ledgerUpdate.currency = accountData.currency;
      }

      if (accountData.description || accountData.bankName || accountData.accountNumber) {
        const parts = [
          accountData.description || existingData.description || '',
          accountData.bankName || existingData.bankName || '',
          accountData.accountNumber || existingData.accountNumber || ''
        ].filter(Boolean);
        if (parts.length > 0) {
          ledgerUpdate.description = parts.join(' • ');
        }
      }

      if (typeof accountData.isActive === 'boolean') {
        ledgerUpdate.isActive = accountData.isActive;
      }

      ledgerUpdate.linkedFinancialAccountId = accountId;

      if (Object.keys(ledgerUpdate).length > 0) {
        await updateLedgerAccountRecord(companyId, ledgerAccountId, ledgerUpdate);
      }
    }
  } catch (error) {
    console.error('Error updating financial account:', error);
    throw error;
  }
};

/**
 * Delete a financial account
 * @param {string} companyId - Company ID
 * @param {string} accountId - Account ID
 */
export const deleteFinancialAccount = async (companyId, accountId) => {
  try {
    const accountRef = doc(db, 'companies', companyId, 'financialAccounts', accountId);
    const accountSnap = await getDoc(accountRef);

    if (accountSnap.exists()) {
      const accountData = accountSnap.data();
      if (accountData?.ledgerAccountId) {
        try {
          await updateLedgerAccountRecord(companyId, accountData.ledgerAccountId, {
            isActive: false,
            linkedFinancialAccountId: '',
            description: `${accountData.description || accountData.name || 'Financial account'} • archived ${new Date().toISOString().split('T')[0]}`
          });
        } catch (ledgerError) {
          console.error('Failed to archive linked ledger account:', ledgerError);
        }
      }
    }

    await deleteDoc(accountRef);
  } catch (error) {
    console.error('Error deleting financial account:', error);
    throw error;
  }
};

/**
 * Update account balance (used when transactions are added/modified)
 * @param {string} companyId - Company ID
 * @param {string} accountId - Account ID
 * @param {number} amount - Amount to adjust (positive for income, negative for expense)
 * @param {string} type - Transaction type: 'income' | 'expense'
 */
export const updateAccountBalance = async (companyId, accountId, amount, type) => {
  try {
    const accountRef = doc(db, 'companies', companyId, 'financialAccounts', accountId);
    const accountDoc = await getDoc(accountRef);
    
    if (!accountDoc.exists()) {
      throw new Error('Financial account not found');
    }
    
    const currentBalance = accountDoc.data().currentBalance || 0;
    const adjustment = type === 'income' ? amount : -Math.abs(amount);
    const newBalance = currentBalance + adjustment;
    
    await updateDoc(accountRef, {
      currentBalance: newBalance,
      updatedAt: serverTimestamp()
    });
    
    return newBalance;
  } catch (error) {
    console.error('Error updating account balance:', error);
    throw error;
  }
};

// ==================== INCOME ====================

/**
 * Get all income transactions for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of income objects
 */
export const getCompanyIncome = async (companyId) => {
  try {
    const incomeRef = collection(db, 'companies', companyId, 'income');
    const q = query(incomeRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const incomeList = [];
    querySnapshot.forEach((doc) => {
      incomeList.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return incomeList;
  } catch (error) {
    console.error('Error getting company income:', error);
    throw error;
  }
};

/**
 * Add income transaction to a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID (for audit)
 * @param {object} incomeData - Income data
 * @returns {Promise<string>} Income document ID
 */
export const addCompanyIncome = async (companyId, userId, incomeData) => {
  try {
    const incomeRef = collection(db, 'companies', companyId, 'income');
    const docRef = await addDoc(incomeRef, {
      date: incomeData.date || new Date().toISOString().split('T')[0],
      source: incomeData.source || '',
      customer: incomeData.customer || '',
      description: incomeData.description || '',
      amount: parseFloat(incomeData.amount || 0),
      currency: incomeData.currency || 'EUR',
      btw: parseFloat(incomeData.btw || 0),
      financialAccountId: incomeData.financialAccountId || '',
      invoiceId: incomeData.invoiceId || '',
      transactionId: incomeData.transactionId || '',
      reconciled: incomeData.reconciled || false,
      category: incomeData.category || 'Other',
      notes: incomeData.notes || '',
      attachments: incomeData.attachments || [],
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    try {
      const ledgerEntryId = await createIncomeLedgerEntry(
        companyId,
        docRef.id,
        {
          ...incomeData,
          createdBy: userId
        },
        userId
      );

      if (ledgerEntryId) {
        await updateDoc(docRef, {
          ledgerEntryId,
          updatedAt: serverTimestamp()
        });
      }
    } catch (ledgerError) {
      console.error('Error creating ledger entry for income:', ledgerError);
    }

    return docRef.id;
  } catch (error) {
    console.error('Error adding company income:', error);
    throw error;
  }
};

/**
 * Update income transaction in a company
 * @param {string} companyId - Company ID
 * @param {string} incomeId - Income ID
 * @param {object} incomeData - Updated income data
 */
export const updateCompanyIncome = async (companyId, incomeId, incomeData) => {
  try {
    const incomeRef = doc(db, 'companies', companyId, 'income', incomeId);
    
    // Get existing income to handle balance updates
    const existingIncome = await getDoc(incomeRef);
    const existingData = existingIncome.exists() ? existingIncome.data() : {};
    
    // Prepare update data
    const updateData = {
      ...incomeData,
      updatedAt: serverTimestamp()
    };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(incomeRef, updateData);

    const ledgerRelevantFields = [
      'amount',
      'currency',
      'financialAccountId',
      'category',
      'customer',
      'date'
    ];

    const shouldRebuildLedger = (
      !existingData?.ledgerEntryId ||
      ledgerRelevantFields.some((field) => Object.prototype.hasOwnProperty.call(incomeData, field))
    );

    if (shouldRebuildLedger) {
      if (existingData?.ledgerEntryId) {
        try {
          await reverseLedgerEntry(companyId, existingData.ledgerEntryId, incomeData.updatedBy || existingData.updatedBy || '');
        } catch (reverseError) {
          console.error('Failed to reverse previous ledger entry for income:', reverseError);
        }
      }

      const mergedData = {
        ...existingData,
        ...incomeData
      };

      try {
        const ledgerEntryId = await createIncomeLedgerEntry(
          companyId,
          incomeId,
          mergedData,
          incomeData.updatedBy || existingData.updatedBy || ''
        );

        await updateDoc(incomeRef, {
          ledgerEntryId: ledgerEntryId || '',
          updatedAt: serverTimestamp()
        });
      } catch (ledgerError) {
        console.error('Failed to rebuild ledger entry for income:', ledgerError);
      }
    }
  } catch (error) {
    console.error('Error updating company income:', error);
    throw error;
  }
};

/**
 * Delete income transaction from a company
 * @param {string} companyId - Company ID
 * @param {string} incomeId - Income ID
 */
export const deleteCompanyIncome = async (companyId, incomeId) => {
  try {
    const incomeRef = doc(db, 'companies', companyId, 'income', incomeId);
    const incomeDoc = await getDoc(incomeRef);
    
    if (incomeDoc.exists()) {
      const incomeData = incomeDoc.data();
      if (incomeData?.ledgerEntryId) {
        try {
          await reverseLedgerEntry(
            companyId,
            incomeData.ledgerEntryId,
            incomeData.updatedBy || incomeData.createdBy || ''
          );
        } catch (reverseError) {
          console.error('Failed to reverse ledger entry for income deletion:', reverseError);
        }
      }
    }
    
    // Delete the income document
    await deleteDoc(incomeRef);
  } catch (error) {
    console.error('Error deleting company income:', error);
    throw error;
  }
};

// ==================== FUNDING & INVESTORS ====================

/**
 * Get all funding sources for a company (seed funds, loans, etc.)
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of funding objects
 */
export const getCompanyFunding = async (companyId) => {
  try {
    const fundingRef = collection(db, 'companies', companyId, 'funding');
    const q = query(fundingRef, orderBy('dateReceived', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const fundingList = [];
    querySnapshot.forEach((doc) => {
      fundingList.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return fundingList;
  } catch (error) {
    console.error('Error getting company funding:', error);
    throw error;
  }
};

/**
 * Add funding source to a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID (for audit)
 * @param {object} fundingData - Funding data
 * @returns {Promise<string>} Funding document ID
 */
export const addFunding = async (companyId, userId, fundingData) => {
  try {
    const fundingRef = collection(db, 'companies', companyId, 'funding');
    const docRef = await addDoc(fundingRef, {
      type: fundingData.type || 'seed_fund',
      name: fundingData.name?.trim() || '',
      amount: parseFloat(fundingData.amount || 0),
      currency: fundingData.currency || 'EUR',
      dateReceived: fundingData.dateReceived || new Date().toISOString().split('T')[0],
      
      // Investment/Equity Details
      equityPercentage: fundingData.equityPercentage ? parseFloat(fundingData.equityPercentage) : 0,
      interestRate: fundingData.interestRate ? parseFloat(fundingData.interestRate) : 0,
      
      // Account Linking
      financialAccountId: fundingData.financialAccountId || '',
      
      // Agreement/Terms
      agreementUrl: fundingData.agreementUrl || '',
      agreementType: fundingData.agreementType || '',
      signedDate: fundingData.signedDate || '',
      
      // Investor/Contact Details
      investorContact: fundingData.investorContact || {
        name: '',
        email: '',
        phone: ''
      },
      
      // Terms
      terms: fundingData.terms?.trim() || '',
      restrictions: fundingData.restrictions?.trim() || '',
      maturityDate: fundingData.maturityDate || '',
      
      // Status
      status: fundingData.status || 'active',
      
      // Metadata
      notes: fundingData.notes?.trim() || '',
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update account balance if financial account is linked
    if (fundingData.financialAccountId && fundingData.amount) {
      const amount = parseFloat(fundingData.amount || 0);
      if (amount > 0) {
        try {
          await updateAccountBalance(companyId, fundingData.financialAccountId, amount, 'income');
        } catch (balanceError) {
          console.error('Error updating account balance:', balanceError);
        }
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding funding:', error);
    throw error;
  }
};

/**
 * Update funding source
 * @param {string} companyId - Company ID
 * @param {string} fundingId - Funding ID
 * @param {object} fundingData - Updated funding data
 */
export const updateFunding = async (companyId, fundingId, fundingData) => {
  try {
    const fundingRef = doc(db, 'companies', companyId, 'funding', fundingId);
    
    // Get existing funding to handle balance updates
    const existingFunding = await getDoc(fundingRef);
    const existingData = existingFunding.exists() ? existingFunding.data() : {};
    
    // Prepare update data
    const updateData = {
      ...fundingData,
      updatedAt: serverTimestamp()
    };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(fundingRef, updateData);
    
    // Handle account balance updates if amount or account changed
    const oldAmount = parseFloat(existingData.amount || 0);
    const newAmount = parseFloat(fundingData.amount || oldAmount);
    const oldAccountId = existingData.financialAccountId || '';
    const newAccountId = fundingData.financialAccountId || oldAccountId;
    
    if (oldAccountId && oldAccountId !== newAccountId) {
      // Account changed: reverse old, apply new
      try {
        await updateAccountBalance(companyId, oldAccountId, -oldAmount, 'income');
        if (newAccountId) {
          await updateAccountBalance(companyId, newAccountId, newAmount, 'income');
        }
      } catch (balanceError) {
        console.error('Error updating account balances:', balanceError);
      }
    } else if (newAccountId && oldAmount !== newAmount) {
      // Same account, different amount: adjust difference
      const difference = newAmount - oldAmount;
      if (difference !== 0) {
        try {
          await updateAccountBalance(companyId, newAccountId, difference, 'income');
        } catch (balanceError) {
          console.error('Error updating account balance:', balanceError);
        }
      }
    }
  } catch (error) {
    console.error('Error updating funding:', error);
    throw error;
  }
};

/**
 * Delete funding source
 * @param {string} companyId - Company ID
 * @param {string} fundingId - Funding ID
 */
export const deleteFunding = async (companyId, fundingId) => {
  try {
    // Get existing funding to reverse balance update
    const fundingRef = doc(db, 'companies', companyId, 'funding', fundingId);
    const fundingDoc = await getDoc(fundingRef);
    
    if (fundingDoc.exists()) {
      const fundingData = fundingDoc.data();
      
      // Reverse account balance if financial account was linked
      if (fundingData.financialAccountId && fundingData.amount) {
        const amount = parseFloat(fundingData.amount || 0);
        if (amount > 0) {
          try {
            await updateAccountBalance(companyId, fundingData.financialAccountId, -amount, 'income');
          } catch (balanceError) {
            console.error('Error reversing account balance:', balanceError);
          }
        }
      }
    }
    
    // Delete the funding document
    await deleteDoc(fundingRef);
  } catch (error) {
    console.error('Error deleting funding:', error);
    throw error;
  }
};

/**
 * Get all investors for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of investor objects
 */
export const getCompanyInvestors = async (companyId) => {
  try {
    const investorsRef = collection(db, 'companies', companyId, 'investors');
    const q = query(investorsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const investorsList = [];
    querySnapshot.forEach((doc) => {
      investorsList.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return investorsList;
  } catch (error) {
    console.error('Error getting company investors:', error);
    throw error;
  }
};

/**
 * Add investor to a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID (for audit)
 * @param {object} investorData - Investor data
 * @returns {Promise<string>} Investor document ID
 */
export const addInvestor = async (companyId, userId, investorData) => {
  try {
    const investorsRef = collection(db, 'companies', companyId, 'investors');
    const docRef = await addDoc(investorsRef, {
      name: investorData.name?.trim() || '',
      type: investorData.type || 'Angel',
      
      // Investment History
      totalInvested: parseFloat(investorData.totalInvested || 0),
      currency: investorData.currency || 'EUR',
      investments: investorData.investments || [],
      
      // Rights & Governance
      boardSeat: investorData.boardSeat || false,
      votingRights: investorData.votingRights || false,
      equityPercentage: parseFloat(investorData.equityPercentage || 0),
      
      // Contact
      contact: investorData.contact || {
        name: '',
        email: '',
        phone: ''
      },
      
      // Documents
      documents: investorData.documents || [],
      
      // Communications Log
      communications: investorData.communications || [],
      
      // Metadata
      notes: investorData.notes?.trim() || '',
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding investor:', error);
    throw error;
  }
};

/**
 * Update investor
 * @param {string} companyId - Company ID
 * @param {string} investorId - Investor ID
 * @param {object} investorData - Updated investor data
 */
export const updateInvestor = async (companyId, investorId, investorData) => {
  try {
    const investorRef = doc(db, 'companies', companyId, 'investors', investorId);
    
    const updateData = {
      ...investorData,
      updatedAt: serverTimestamp()
    };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    await updateDoc(investorRef, updateData);
  } catch (error) {
    console.error('Error updating investor:', error);
    throw error;
  }
};

/**
 * Delete investor
 * @param {string} companyId - Company ID
 * @param {string} investorId - Investor ID
 */
export const deleteInvestor = async (companyId, investorId) => {
  try {
    const investorRef = doc(db, 'companies', companyId, 'investors', investorId);
    await deleteDoc(investorRef);
  } catch (error) {
    console.error('Error deleting investor:', error);
    throw error;
  }
};

// ==================== COMPANY BRANDING ====================

/**
 * Get company branding (public - for login/signup pages)
 * @param {string} companyId - Company ID
 * @returns {Promise<object>} Company branding data
 */
export const getCompanyBranding = async (companyId) => {
  try {
    if (!companyId) {
      return null;
    }
    
    const companyRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return null;
    }
    
    const companyData = companyDoc.data();
    return {
      id: companyDoc.id,
      name: companyData.name || 'Biz-CoPilot',
      branding: companyData.branding || null
    };
  } catch (error) {
    console.error('Error fetching company branding:', error);
    // Return null instead of throwing - allows fallback to default branding
    return null;
  }
};

/**
 * Update company branding
 * @param {string} companyId - Company ID
 * @param {object} brandingData - Branding data to update
 * @returns {Promise<void>}
 */
export const updateCompanyBranding = async (companyId, brandingData) => {
  try {
    const companyRef = doc(db, 'companies', companyId);
    await updateDoc(companyRef, {
      branding: brandingData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating company branding:', error);
    throw error;
  }
};

/**
 * Get company onboarding settings
 * @param {string} companyId - Company ID
 * @returns {Promise<object>} Onboarding data
 */
export const getCompanyOnboarding = async (companyId) => {
  try {
    if (!companyId) return null;
    
    const companyRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return null;
    }
    
    const companyData = companyDoc.data();
    return {
      companyName: companyData.name || 'Biz-CoPilot',
      chainOfCommand: companyData.onboarding?.chainOfCommand || {},
      duties: companyData.onboarding?.duties || {},
      schedule: companyData.onboarding?.schedule || {}
    };
  } catch (error) {
    console.error('Error fetching company onboarding:', error);
    return null;
  }
};

/**
 * Update company onboarding settings
 * @param {string} companyId - Company ID
 * @param {object} onboardingData - Onboarding data to save
 * @returns {Promise<void>}
 */
export const updateCompanyOnboarding = async (companyId, onboardingData) => {
  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    
    const companyRef = doc(db, 'companies', companyId);
    await updateDoc(companyRef, {
      onboarding: onboardingData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating company onboarding:', error);
    throw error;
  }
};

/**
 * Complete company onboarding for a user
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID (optional, defaults to current user)
 * @returns {Promise<void>}
 */
export const completeCompanyOnboarding = async (companyId, userId) => {
  try {
    if (!companyId || !userId) {
      console.warn('Missing companyId or userId for completing company onboarding');
      return;
    }
    
    const onboardingRef = doc(db, 'companies', companyId, 'onboarding', userId);
    await setDoc(onboardingRef, {
      completed: true,
      completedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error completing company onboarding:', error);
    throw error;
  }
};

/**
 * Check if user has completed company onboarding
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID (optional)
 * @returns {Promise<boolean>}
 */
export const hasCompletedCompanyOnboarding = async (companyId, userId) => {
  try {
    if (!companyId || !userId) {
      return false;
    }
    
    const onboardingRef = doc(db, 'companies', companyId, 'onboarding', userId);
    const onboardingDoc = await getDoc(onboardingRef);
    
    if (!onboardingDoc.exists()) {
      return false;
    }
    
    return onboardingDoc.data().completed === true;
  } catch (error) {
    console.error('Error checking company onboarding:', error);
    return false;
  }
};

/**
 * Store legal acceptance for a user in a company
 * @param {string} companyId - Company ID
 * @param {string} userId - User ID
 * @param {Object} acceptance - Object with termsAccepted, privacyAccepted, and timestamps
 * @returns {Promise<void>}
 */
export const storeLegalAcceptance = async (companyId, userId, acceptance) => {
  try {
    if (!companyId || !userId) {
      throw new Error('Company ID and User ID are required');
    }
    
    const onboardingRef = doc(db, 'companies', companyId, 'onboarding', userId);
    await setDoc(onboardingRef, {
      legalAcceptance: {
        termsAccepted: acceptance.termsAccepted || false,
        privacyAccepted: acceptance.privacyAccepted || false,
        termsAcceptedAt: acceptance.termsAccepted ? serverTimestamp() : null,
        privacyAcceptedAt: acceptance.privacyAccepted ? serverTimestamp() : null
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error storing legal acceptance:', error);
    throw error;
  }
};

/**
 * Upload company logo to Firebase Storage
 * @param {string} companyId - Company ID
 * @param {File} file - Logo file (PNG, JPG, SVG)
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<object>} Upload result with download URL
 */
export const uploadCompanyLogo = async (companyId, file, onProgress = null) => {
  try {
    // Validate file size (max 2 MB for logos)
    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSize) {
      throw new Error('Logo file size exceeds 2 MB limit');
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PNG, JPG, and SVG files are allowed');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `logo_${timestamp}.${fileExtension}`;
    const filePath = `companies/${companyId}/branding/${fileName}`;

    // Create storage reference
    const storageRef = ref(storage, filePath);

    // Upload with progress tracking if callback provided
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Error uploading logo:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                fileName: file.name,
                fileUrl: downloadURL,
                filePath: filePath,
                fileType: file.type,
                fileSize: file.size,
                uploadedAt: new Date().toISOString()
              });
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      // Simple upload without progress tracking
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      return {
        fileName: file.name,
        fileUrl: downloadURL,
        filePath: filePath,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Error uploading company logo:', error);
    throw error;
  }
};

/**
 * Delete company logo from Firebase Storage
 * @param {string} logoPath - Path to logo in storage
 * @returns {Promise<void>}
 */
export const deleteCompanyLogo = async (logoPath) => {
  try {
    if (!logoPath) return;
    
    const storageRef = ref(storage, logoPath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting company logo:', error);
    // Don't throw - logo might already be deleted
    console.warn('Logo deletion failed (may already be deleted):', error);
  }
};

/**
 * Validate a VAT number using Firebase callable function (VIES proxy)
 */
export const validateVatNumber = async (countryCode, vatNumber) => {
  const callable = httpsCallable(functions, 'validateVat');
  const response = await callable({
    countryCode,
    vatNumber
  });
  return response.data;
};

// ==================== CONTRACTS ====================

export const getCompanyContracts = async (companyId) => {
  if (!companyId) return [];

  try {
    const contractsRef = collection(db, 'companies', companyId, 'contracts');
    const snapshot = await getDocs(contractsRef);

    const contracts = [];
    snapshot.forEach((docSnap) => {
      contracts.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return contracts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (error) {
    console.error('Error loading company contracts:', error);
    throw error;
  }
};

export const addCompanyContract = async (companyId, userId, contractData = {}) => {
  if (!companyId) throw new Error('Company ID is required');

  try {
    const contractsRef = collection(db, 'companies', companyId, 'contracts');
    const payload = {
      name: contractData.name?.trim() || '',
      reference: contractData.reference?.trim() || '',
      vendorId: contractData.vendorId || '',
      vendorName: contractData.vendorName?.trim() || '',
      status: contractData.status || 'active',
      currency: contractData.currency || '',
      value: Number.isFinite(parseFloat(contractData.value)) ? parseFloat(contractData.value) : null,
      url: contractData.url?.trim() || '',
      startDate: contractData.startDate || '',
      endDate: contractData.endDate || '',
      notes: contractData.notes?.trim() || '',
      createdBy: userId || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(contractsRef, payload);
    return docRef.id;
  } catch (error) {
    console.error('Error adding company contract:', error);
    throw error;
  }
};

export const updateCompanyContract = async (companyId, contractId, contractData = {}) => {
  if (!companyId || !contractId) throw new Error('Company ID and contract ID are required');

  try {
    const contractRef = doc(db, 'companies', companyId, 'contracts', contractId);
    const payload = {
      ...contractData,
      updatedAt: serverTimestamp()
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    await updateDoc(contractRef, payload);
    return true;
  } catch (error) {
    console.error('Error updating company contract:', error);
    throw error;
  }
};

export const deleteCompanyContract = async (companyId, contractId) => {
  if (!companyId || !contractId) throw new Error('Company ID and contract ID are required');

  try {
    const contractRef = doc(db, 'companies', companyId, 'contracts', contractId);
    await deleteDoc(contractRef);
    return true;
  } catch (error) {
    console.error('Error deleting company contract:', error);
    throw error;
  }
};

// ==================== ACCOUNTS RECEIVABLE (AR) - CUSTOMERS ====================

export const getCompanyCustomers = async (companyId) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const customersRef = collection(db, 'companies', companyId, 'customers');
    const snapshot = await getDocs(query(customersRef, orderBy('name')));
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

export const getCompanyCustomer = async (companyId, customerId) => {
  if (!companyId || !customerId) throw new Error('Company ID and customer ID are required');
  try {
    const customerRef = doc(db, 'companies', companyId, 'customers', customerId);
    const customerSnap = await getDoc(customerRef);
    if (!customerSnap.exists()) return null;
    return { id: customerSnap.id, ...customerSnap.data() };
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw error;
  }
};

export const addCompanyCustomer = async (companyId, userId, customerData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const customersRef = collection(db, 'companies', companyId, 'customers');
    const newCustomer = {
      name: customerData.name || '',
      email: customerData.email || '',
      phone: customerData.phone || '',
      company: customerData.company || '',
      address: customerData.address || '',
      city: customerData.city || '',
      country: customerData.country || '',
      postalCode: customerData.postalCode || '',
      vatNumber: customerData.vatNumber || '',
      taxId: customerData.taxId || '',
      notes: customerData.notes || '',
      tags: customerData.tags || [],
      // SaaS-specific fields
      accountType: customerData.accountType || 'one_time', // 'one_time', 'subscription', 'enterprise'
      billingContact: customerData.billingContact || '',
      technicalContact: customerData.technicalContact || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(customersRef, newCustomer);
    return docRef.id;
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
};

export const updateCompanyCustomer = async (companyId, customerId, customerData = {}) => {
  if (!companyId || !customerId) throw new Error('Company ID and customer ID are required');
  try {
    const customerRef = doc(db, 'companies', companyId, 'customers', customerId);
    await updateDoc(customerRef, {
      ...customerData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCompanyCustomer = async (companyId, customerId) => {
  if (!companyId || !customerId) throw new Error('Company ID and customer ID are required');
  try {
    const customerRef = doc(db, 'companies', companyId, 'customers', customerId);
    await deleteDoc(customerRef);
    return true;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

// ==================== ACCOUNTS RECEIVABLE (AR) - INVOICES ====================

export const getCompanyInvoices = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const invoicesRef = collection(db, 'companies', companyId, 'invoices');
    let q = query(invoicesRef);
    
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    if (options.customerId) {
      q = query(q, where('customerId', '==', options.customerId));
    }
    
    q = query(q, orderBy('invoiceDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

export const getCompanyInvoice = async (companyId, invoiceId) => {
  if (!companyId || !invoiceId) throw new Error('Company ID and invoice ID are required');
  try {
    const invoiceRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    if (!invoiceSnap.exists()) return null;
    return { id: invoiceSnap.id, ...invoiceSnap.data() };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
};

export const addCompanyInvoice = async (companyId, userId, invoiceData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const invoicesRef = collection(db, 'companies', companyId, 'invoices');
    
    // Generate invoice number if not provided
    let invoiceNumber = invoiceData.invoiceNumber;
    if (!invoiceNumber) {
      const year = new Date().getFullYear();
      const existingInvoices = await getCompanyInvoices(companyId);
      const yearInvoices = existingInvoices.filter(inv => {
        const invDate = inv.invoiceDate?.toDate?.() || new Date(inv.invoiceDate);
        return invDate.getFullYear() === year;
      });
      const nextNum = (yearInvoices.length + 1).toString().padStart(4, '0');
      invoiceNumber = `INV-${year}-${nextNum}`;
    }
    
    const newInvoice = {
      invoiceNumber: invoiceNumber,
      customerId: invoiceData.customerId || '',
      customerName: invoiceData.customerName || '',
      customerEmail: invoiceData.customerEmail || '',
      customerAddress: invoiceData.customerAddress || '',
      invoiceDate: invoiceData.invoiceDate ? Timestamp.fromDate(new Date(invoiceData.invoiceDate)) : serverTimestamp(),
      dueDate: invoiceData.dueDate ? Timestamp.fromDate(new Date(invoiceData.dueDate)) : null,
      status: invoiceData.status || 'draft', // 'draft', 'sent', 'paid', 'overdue', 'cancelled'
      lineItems: invoiceData.lineItems || [],
      subtotal: invoiceData.subtotal || 0,
      taxRate: invoiceData.taxRate || 21,
      taxAmount: invoiceData.taxAmount || 0,
      total: invoiceData.total || 0,
      currency: invoiceData.currency || 'EUR',
      notes: invoiceData.notes || '',
      terms: invoiceData.terms || '',
      // SaaS-specific fields
      subscriptionId: invoiceData.subscriptionId || null,
      billingCycle: invoiceData.billingCycle || null, // 'monthly', 'quarterly', 'annual'
      // Payment tracking
      paidDate: invoiceData.paidDate ? Timestamp.fromDate(new Date(invoiceData.paidDate)) : null,
      paidAmount: invoiceData.paidAmount || 0,
      paymentMethod: invoiceData.paymentMethod || '',
      financialAccountId: invoiceData.financialAccountId || '',
      // Metadata
      quoteId: invoiceData.quoteId || null,
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(invoicesRef, newInvoice);
    
    // Create ledger entry for invoice (if paid)
    // Note: Ledger entry will be created when invoice status changes to 'paid'
    // This avoids circular imports and ensures proper sequencing
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding invoice:', error);
    throw error;
  }
};

export const updateCompanyInvoice = async (companyId, invoiceId, invoiceData = {}) => {
  if (!companyId || !invoiceId) throw new Error('Company ID and invoice ID are required');
  try {
    const invoiceRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    if (!invoiceSnap.exists()) throw new Error('Invoice not found');
    
    const existingData = invoiceSnap.data();
    const wasPaid = existingData.status === 'paid';
    const willBePaid = invoiceData.status === 'paid';
    
    // Filter out undefined values - Firestore doesn't allow undefined
    const cleanInvoiceData = Object.fromEntries(
      Object.entries(invoiceData).filter(([_, value]) => value !== undefined)
    );
    
    const updateData = {
      ...cleanInvoiceData,
      updatedAt: serverTimestamp()
    };
    
    // Convert date strings to Timestamps
    if (updateData.invoiceDate && typeof updateData.invoiceDate === 'string') {
      updateData.invoiceDate = Timestamp.fromDate(new Date(updateData.invoiceDate));
    }
    if (updateData.dueDate && typeof updateData.dueDate === 'string') {
      updateData.dueDate = Timestamp.fromDate(new Date(updateData.dueDate));
    }
    if (updateData.paidDate && typeof updateData.paidDate === 'string') {
      updateData.paidDate = Timestamp.fromDate(new Date(updateData.paidDate));
    }
    
    await updateDoc(invoiceRef, updateData);
    
    // Create ledger entry and income record when invoice is marked as paid
    if (!wasPaid && willBePaid && invoiceData.financialAccountId) {
      try {
        const mergedData = { ...existingData, ...invoiceData };
        const paidDate = mergedData.paidDate || mergedData.invoiceDate;
        const paidDateStr = paidDate?.toDate ? paidDate.toDate().toISOString().split('T')[0] : 
                           (paidDate instanceof Date ? paidDate.toISOString().split('T')[0] : paidDate);
        
        // Create income record in the income collection
        try {
          const incomeRef = collection(db, 'companies', companyId, 'income');
          const incomeData = {
            date: paidDateStr || new Date().toISOString().split('T')[0],
            source: 'Invoice Payment',
            customer: mergedData.customerName || mergedData.customer || '',
            description: `Invoice ${mergedData.invoiceNumber || invoiceId} - ${mergedData.lineItems?.[0]?.description || 'Service Revenue'}`,
            amount: parseFloat(mergedData.total || 0),
            currency: mergedData.currency || 'EUR',
            btw: parseFloat(mergedData.taxRate || 21),
            financialAccountId: invoiceData.financialAccountId,
            invoiceId: invoiceId,
            category: mergedData.category || invoiceData.category || 'Service Revenue',
            notes: `Payment received for invoice ${mergedData.invoiceNumber || invoiceId}`,
            reconciled: true,
            createdBy: invoiceData.updatedBy || existingData.createdBy || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          const incomeDocRef = await addDoc(incomeRef, incomeData);
          
          // Create ledger entry (this will also update financial account balance)
          const ledgerEntryId = await createIncomeLedgerEntry(
            companyId,
            incomeDocRef.id,
            {
              amount: mergedData.total || 0,
              currency: mergedData.currency || 'EUR',
              category: 'Service Revenue',
              financialAccountId: invoiceData.financialAccountId,
              description: `Invoice ${mergedData.invoiceNumber || invoiceId}`,
              date: paidDateStr,
              customer: mergedData.customerName || mergedData.customer || '',
              invoiceId: invoiceId
            },
            invoiceData.updatedBy || existingData.createdBy || ''
          );
          
          if (ledgerEntryId) {
            await updateDoc(incomeDocRef, {
              ledgerEntryId,
              updatedAt: serverTimestamp()
            });
          }
          
          // Link income record to invoice
          await updateDoc(invoiceRef, {
            incomeId: incomeDocRef.id,
            ledgerEntryId: ledgerEntryId || '',
            updatedAt: serverTimestamp()
          });
        } catch (incomeError) {
          console.error('Error creating income record for paid invoice:', incomeError);
          // Continue with ledger entry even if income creation fails
        }
        
        // Also create ledger entry directly linked to invoice (for backward compatibility)
        try {
          const invoiceLedgerEntryId = await createIncomeLedgerEntry(
            companyId,
            invoiceId,
            {
              amount: mergedData.total || 0,
              currency: mergedData.currency || 'EUR',
              category: mergedData.category || invoiceData.category || 'Service Revenue',
              financialAccountId: invoiceData.financialAccountId,
              description: `Invoice ${mergedData.invoiceNumber || invoiceId}`,
              date: paidDateStr,
              customer: mergedData.customerName || mergedData.customer || '',
              invoiceId: invoiceId
            },
            invoiceData.updatedBy || existingData.createdBy || ''
          );
          
          if (invoiceLedgerEntryId) {
            await updateDoc(invoiceRef, {
              invoiceLedgerEntryId: invoiceLedgerEntryId,
              updatedAt: serverTimestamp()
            });
          }
        } catch (ledgerError) {
          console.error('Error creating ledger entry for paid invoice:', ledgerError);
        }
      } catch (error) {
        console.error('Error processing paid invoice:', error);
        // Don't throw - invoice update succeeded, income/ledger creation is secondary
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

export const deleteCompanyInvoice = async (companyId, invoiceId) => {
  if (!companyId || !invoiceId) throw new Error('Company ID and invoice ID are required');
  try {
    const invoiceRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
    await deleteDoc(invoiceRef);
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};

// ==================== ACCOUNTS RECEIVABLE (AR) - QUOTES ====================

export const getCompanyQuotes = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const quotesRef = collection(db, 'companies', companyId, 'quotes');
    let q = query(quotesRef);
    
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    if (options.customerId) {
      q = query(q, where('customerId', '==', options.customerId));
    }
    
    q = query(q, orderBy('quoteDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error fetching quotes:', error);
    throw error;
  }
};

export const addCompanyQuote = async (companyId, userId, quoteData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const quotesRef = collection(db, 'companies', companyId, 'quotes');
    
    // Generate quote number if not provided
    let quoteNumber = quoteData.quoteNumber;
    if (!quoteNumber) {
      const year = new Date().getFullYear();
      const existingQuotes = await getCompanyQuotes(companyId);
      const yearQuotes = existingQuotes.filter(q => {
        const qDate = q.quoteDate?.toDate?.() || new Date(q.quoteDate);
        return qDate.getFullYear() === year;
      });
      const nextNum = (yearQuotes.length + 1).toString().padStart(4, '0');
      quoteNumber = `QUO-${year}-${nextNum}`;
    }
    
    const expiryDate = quoteData.expiryDate 
      ? Timestamp.fromDate(new Date(quoteData.expiryDate))
      : (() => {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 30); // Default 30 days
          return Timestamp.fromDate(expiry);
        })();
    
    const newQuote = {
      quoteNumber: quoteNumber,
      customerId: quoteData.customerId || '',
      customerName: quoteData.customerName || '',
      customerEmail: quoteData.customerEmail || '',
      customerAddress: quoteData.customerAddress || '',
      quoteDate: quoteData.quoteDate ? Timestamp.fromDate(new Date(quoteData.quoteDate)) : serverTimestamp(),
      expiryDate: expiryDate,
      status: quoteData.status || 'draft', // 'draft', 'sent', 'accepted', 'rejected', 'expired'
      lineItems: quoteData.lineItems || [],
      subtotal: quoteData.subtotal || 0,
      taxRate: quoteData.taxRate || 21,
      taxAmount: quoteData.taxAmount || 0,
      total: quoteData.total || 0,
      currency: quoteData.currency || 'EUR',
      notes: quoteData.notes || '',
      terms: quoteData.terms || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(quotesRef, newQuote);
    return docRef.id;
  } catch (error) {
    console.error('Error adding quote:', error);
    throw error;
  }
};

export const updateCompanyQuote = async (companyId, quoteId, quoteData = {}) => {
  if (!companyId || !quoteId) throw new Error('Company ID and quote ID are required');
  try {
    const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
    const updateData = {
      ...quoteData,
      updatedAt: serverTimestamp()
    };
    
    if (quoteData.quoteDate && typeof quoteData.quoteDate === 'string') {
      updateData.quoteDate = Timestamp.fromDate(new Date(quoteData.quoteDate));
    }
    if (quoteData.expiryDate && typeof quoteData.expiryDate === 'string') {
      updateData.expiryDate = Timestamp.fromDate(new Date(quoteData.expiryDate));
    }
    
    await updateDoc(quoteRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating quote:', error);
    throw error;
  }
};

export const convertQuoteToInvoice = async (companyId, quoteId, userId) => {
  if (!companyId || !quoteId || !userId) throw new Error('Company ID, quote ID, and user ID are required');
  try {
    const quoteRef = doc(db, 'companies', companyId, 'quotes', quoteId);
    const quoteSnap = await getDoc(quoteRef);
    if (!quoteSnap.exists()) throw new Error('Quote not found');
    
    const quoteData = quoteSnap.data();
    
    // Create invoice from quote
    const invoiceId = await addCompanyInvoice(companyId, userId, {
      customerId: quoteData.customerId,
      customerName: quoteData.customerName,
      customerEmail: quoteData.customerEmail,
      customerAddress: quoteData.customerAddress,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: quoteData.expiryDate ? quoteData.expiryDate.toDate().toISOString().split('T')[0] : null,
      status: 'draft',
      lineItems: quoteData.lineItems,
      subtotal: quoteData.subtotal,
      taxRate: quoteData.taxRate,
      taxAmount: quoteData.taxAmount,
      total: quoteData.total,
      currency: quoteData.currency,
      notes: quoteData.notes,
      terms: quoteData.terms,
      quoteId: quoteId
    });
    
    // Update quote status
    await updateCompanyQuote(companyId, quoteId, { status: 'accepted' });
    
    return invoiceId;
  } catch (error) {
    console.error('Error converting quote to invoice:', error);
    throw error;
  }
};

// ==================== ACCOUNTS RECEIVABLE (AR) - SUBSCRIPTIONS (SaaS) ====================

export const getCompanySubscriptions = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const subscriptionsRef = collection(db, 'companies', companyId, 'subscriptions');
    let q = query(subscriptionsRef);
    
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    if (options.customerId) {
      q = query(q, where('customerId', '==', options.customerId));
    }
    
    q = query(q, orderBy('startDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    throw error;
  }
};

export const addCompanySubscription = async (companyId, userId, subscriptionData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const subscriptionsRef = collection(db, 'companies', companyId, 'subscriptions');
    
    const newSubscription = {
      customerId: subscriptionData.customerId || '',
      customerName: subscriptionData.customerName || '',
      planName: subscriptionData.planName || '',
      planType: subscriptionData.planType || 'monthly', // 'monthly', 'quarterly', 'annual'
      billingCycle: subscriptionData.billingCycle || 'monthly', // 'monthly', 'quarterly', 'annual'
      amount: subscriptionData.amount || 0,
      currency: subscriptionData.currency || 'EUR',
      taxRate: subscriptionData.taxRate || 21,
      startDate: subscriptionData.startDate ? Timestamp.fromDate(new Date(subscriptionData.startDate)) : serverTimestamp(),
      endDate: subscriptionData.endDate ? Timestamp.fromDate(new Date(subscriptionData.endDate)) : null,
      status: subscriptionData.status || 'active', // 'active', 'paused', 'cancelled', 'expired'
      autoRenew: subscriptionData.autoRenew !== false,
      nextBillingDate: subscriptionData.nextBillingDate ? Timestamp.fromDate(new Date(subscriptionData.nextBillingDate)) : null,
      seats: subscriptionData.seats || 1,
      // SaaS-specific
      mrr: subscriptionData.mrr || 0, // Monthly Recurring Revenue
      arr: subscriptionData.arr || 0, // Annual Recurring Revenue
      notes: subscriptionData.notes || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(subscriptionsRef, newSubscription);
    return docRef.id;
  } catch (error) {
    console.error('Error adding subscription:', error);
    throw error;
  }
};

export const updateCompanySubscription = async (companyId, subscriptionId, subscriptionData = {}) => {
  if (!companyId || !subscriptionId) throw new Error('Company ID and subscription ID are required');
  try {
    const subscriptionRef = doc(db, 'companies', companyId, 'subscriptions', subscriptionId);
    const updateData = {
      ...subscriptionData,
      updatedAt: serverTimestamp()
    };
    
    if (subscriptionData.startDate && typeof subscriptionData.startDate === 'string') {
      updateData.startDate = Timestamp.fromDate(new Date(subscriptionData.startDate));
    }
    if (subscriptionData.endDate && typeof subscriptionData.endDate === 'string') {
      updateData.endDate = Timestamp.fromDate(new Date(subscriptionData.endDate));
    }
    if (subscriptionData.nextBillingDate && typeof subscriptionData.nextBillingDate === 'string') {
      updateData.nextBillingDate = Timestamp.fromDate(new Date(subscriptionData.nextBillingDate));
    }
    
    await updateDoc(subscriptionRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

export const deleteCompanySubscription = async (companyId, subscriptionId) => {
  if (!companyId || !subscriptionId) throw new Error('Company ID and subscription ID are required');
  try {
    const subscriptionRef = doc(db, 'companies', companyId, 'subscriptions', subscriptionId);
    await deleteDoc(subscriptionRef);
    return true;
  } catch (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }
};

/**
 * Generate an invoice from a subscription (manual trigger)
 * This creates an invoice for the current billing period
 * @param {string} companyId - Company ID
 * @param {string} subscriptionId - Subscription ID
 * @param {string} userId - User ID
 * @returns {Promise<string>} Invoice ID
 */
export const generateInvoiceFromSubscription = async (companyId, subscriptionId, userId) => {
  if (!companyId || !subscriptionId || !userId) {
    throw new Error('Company ID, subscription ID, and user ID are required');
  }
  
  try {
    // Get subscription data
    const subscriptionRef = doc(db, 'companies', companyId, 'subscriptions', subscriptionId);
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    if (!subscriptionSnap.exists()) {
      throw new Error('Subscription not found');
    }
    
    const subscription = subscriptionSnap.data();
    
    // Check if subscription is active
    if (subscription.status !== 'active') {
      throw new Error('Can only generate invoices for active subscriptions');
    }
    
    // Get customer data if customerId exists
    let customerData = {
      name: subscription.customerName || '',
      email: subscription.customerEmail || '',
      address: subscription.customerAddress || ''
    };
    
    if (subscription.customerId) {
      try {
        const customerRef = doc(db, 'companies', companyId, 'customers', subscription.customerId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          const customer = customerSnap.data();
          customerData = {
            name: customer.name || customer.company || subscription.customerName || '',
            email: customer.email || subscription.customerEmail || '',
            address: [
              customer.address,
              customer.city,
              customer.postalCode,
              customer.country
            ].filter(Boolean).join(', ')
          };
        }
      } catch (customerError) {
        console.warn('Could not fetch customer data, using subscription data:', customerError);
      }
    }
    
    // Calculate invoice amounts
    const amount = parseFloat(subscription.amount || 0);
    const taxRate = parseFloat(subscription.taxRate || 21);
    const subtotal = amount;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    // Create invoice
    const invoiceData = {
      customerId: subscription.customerId || '',
      customerName: customerData.name,
      customerEmail: customerData.email,
      customerAddress: customerData.address,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      status: 'draft',
      lineItems: [{
        description: `${subscription.planName} - ${subscription.billingCycle} subscription`,
        quantity: subscription.seats || 1,
        unitPrice: amount,
        amount: amount * (subscription.seats || 1)
      }],
      subtotal: subtotal * (subscription.seats || 1),
      taxRate: taxRate,
      taxAmount: taxAmount * (subscription.seats || 1),
      total: total * (subscription.seats || 1),
      currency: subscription.currency || 'EUR',
      subscriptionId: subscriptionId,
      billingCycle: subscription.billingCycle,
      notes: `Auto-generated from subscription ${subscription.planName}`,
      createdBy: userId
    };
    
    const invoiceId = await addCompanyInvoice(companyId, userId, invoiceData);
    
    // Update subscription with next billing date
    const nextBillingDate = subscription.nextBillingDate?.toDate 
      ? subscription.nextBillingDate.toDate() 
      : subscription.nextBillingDate 
      ? new Date(subscription.nextBillingDate)
      : new Date();
    
    if (subscription.billingCycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (subscription.billingCycle === 'quarterly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
    } else if (subscription.billingCycle === 'annual') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }
    
    await updateCompanySubscription(companyId, subscriptionId, {
      nextBillingDate: nextBillingDate.toISOString().split('T')[0],
      lastInvoiceGenerated: new Date().toISOString(),
      lastInvoiceId: invoiceId
    });
    
    return invoiceId;
  } catch (error) {
    console.error('Error generating invoice from subscription:', error);
    throw error;
  }
};

// ==================== MARKETING MODULE ====================

// ==================== MARKETING CAMPAIGNS ====================

export const getCompanyCampaigns = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const campaignsRef = collection(db, 'companies', companyId, 'campaigns');
    let q = query(campaignsRef);
    
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    if (options.type) {
      q = query(q, where('type', '==', options.type));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error getting campaigns:', error);
    throw error;
  }
};

export const addCompanyCampaign = async (companyId, userId, campaignData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const campaignsRef = collection(db, 'companies', companyId, 'campaigns');
    
    const newCampaign = {
      name: campaignData.name || '',
      description: campaignData.description || '',
      type: campaignData.type || 'social', // 'social', 'email', 'content', 'paid', 'event', 'other'
      status: campaignData.status || 'draft', // 'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'
      startDate: campaignData.startDate ? Timestamp.fromDate(new Date(campaignData.startDate)) : null,
      endDate: campaignData.endDate ? Timestamp.fromDate(new Date(campaignData.endDate)) : null,
      budget: parseFloat(campaignData.budget || 0),
      targetAudience: campaignData.targetAudience || '',
      goals: campaignData.goals || [],
      channels: campaignData.channels || [],
      tags: campaignData.tags || [],
      assignedTo: campaignData.assignedTo || '',
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      },
      notes: campaignData.notes || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(campaignsRef, newCampaign);
    return docRef.id;
  } catch (error) {
    console.error('Error adding campaign:', error);
    throw error;
  }
};

export const updateCompanyCampaign = async (companyId, campaignId, campaignData = {}) => {
  if (!companyId || !campaignId) throw new Error('Company ID and campaign ID are required');
  try {
    const campaignRef = doc(db, 'companies', companyId, 'campaigns', campaignId);
    const updateData = {
      ...campaignData,
      updatedAt: serverTimestamp()
    };
    
    if (campaignData.startDate && typeof campaignData.startDate === 'string') {
      updateData.startDate = Timestamp.fromDate(new Date(campaignData.startDate));
    }
    if (campaignData.endDate && typeof campaignData.endDate === 'string') {
      updateData.endDate = Timestamp.fromDate(new Date(campaignData.endDate));
    }
    if (campaignData.budget !== undefined) {
      updateData.budget = parseFloat(campaignData.budget || 0);
    }
    
    await updateDoc(campaignRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
};

export const deleteCompanyCampaign = async (companyId, campaignId) => {
  if (!companyId || !campaignId) throw new Error('Company ID and campaign ID are required');
  try {
    const campaignRef = doc(db, 'companies', companyId, 'campaigns', campaignId);
    await deleteDoc(campaignRef);
    return true;
  } catch (error) {
    console.error('Error deleting campaign:', error);
    throw error;
  }
};

// ==================== SOCIAL MEDIA ACCOUNTS ====================

export const getCompanySocialAccounts = async (companyId) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const accountsRef = collection(db, 'companies', companyId, 'socialAccounts');
    const snapshot = await getDocs(query(accountsRef, orderBy('createdAt', 'desc')));
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error getting social accounts:', error);
    throw error;
  }
};

export const addCompanySocialAccount = async (companyId, userId, accountData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const accountsRef = collection(db, 'companies', companyId, 'socialAccounts');
    
    const newAccount = {
      platform: accountData.platform || 'facebook',
      accountName: accountData.accountName || '',
      accountUrl: accountData.accountUrl || '',
      accessToken: accountData.accessToken || '', // Encrypted in production
      isActive: accountData.isActive !== false,
      followers: accountData.followers || 0,
      notes: accountData.notes || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(accountsRef, newAccount);
    return docRef.id;
  } catch (error) {
    console.error('Error adding social account:', error);
    throw error;
  }
};

export const updateCompanySocialAccount = async (companyId, accountId, accountData = {}) => {
  if (!companyId || !accountId) throw new Error('Company ID and account ID are required');
  try {
    const accountRef = doc(db, 'companies', companyId, 'socialAccounts', accountId);
    await updateDoc(accountRef, {
      ...accountData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating social account:', error);
    throw error;
  }
};

export const deleteCompanySocialAccount = async (companyId, accountId) => {
  if (!companyId || !accountId) throw new Error('Company ID and account ID are required');
  try {
    const accountRef = doc(db, 'companies', companyId, 'socialAccounts', accountId);
    await deleteDoc(accountRef);
    return true;
  } catch (error) {
    console.error('Error deleting social account:', error);
    throw error;
  }
};

// ==================== MARKETING TASKS ====================

export const getCompanyMarketingTasks = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const tasksRef = collection(db, 'companies', companyId, 'marketingTasks');
    let q = query(tasksRef);
    
    if (options.status) {
      q = query(q, where('taskStatus', '==', options.status));
    }
    if (options.assignee) {
      q = query(q, where('taskAssignee', '==', options.assignee));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error getting marketing tasks:', error);
    throw error;
  }
};

export const addCompanyMarketingTask = async (companyId, userId, taskData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const tasksRef = collection(db, 'companies', companyId, 'marketingTasks');
    
    const newTask = {
      title: taskData.title || '',
      taskDescription: taskData.taskDescription || '',
      priority: taskData.priority || 'medium', // 'low', 'medium', 'high', 'urgent'
      dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null,
      taskStatus: taskData.taskStatus || 'todo', // 'todo', 'in-progress', 'review', 'done', 'blocked'
      taskAssignee: taskData.taskAssignee || '',
      campaignId: taskData.campaignId || '',
      tags: taskData.tags || [],
      comments: [],
      attachments: [],
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(tasksRef, newTask);
    return docRef.id;
  } catch (error) {
    console.error('Error adding marketing task:', error);
    throw error;
  }
};

export const updateCompanyMarketingTask = async (companyId, taskId, taskData = {}) => {
  if (!companyId || !taskId) throw new Error('Company ID and task ID are required');
  try {
    const taskRef = doc(db, 'companies', companyId, 'marketingTasks', taskId);
    const updateData = {
      ...taskData,
      updatedAt: serverTimestamp()
    };
    
    if (taskData.dueDate && typeof taskData.dueDate === 'string') {
      updateData.dueDate = Timestamp.fromDate(new Date(taskData.dueDate));
    }
    
    await updateDoc(taskRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating marketing task:', error);
    throw error;
  }
};

export const deleteCompanyMarketingTask = async (companyId, taskId) => {
  if (!companyId || !taskId) throw new Error('Company ID and task ID are required');
  try {
    const taskRef = doc(db, 'companies', companyId, 'marketingTasks', taskId);
    await deleteDoc(taskRef);
    return true;
  } catch (error) {
    console.error('Error deleting marketing task:', error);
    throw error;
  }
};

// ==================== MARKETING ASSETS ====================

export const getCompanyMarketingAssets = async (companyId) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const assetsRef = collection(db, 'companies', companyId, 'marketingAssets');
    const snapshot = await getDocs(query(assetsRef, orderBy('createdAt', 'desc')));
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error getting marketing assets:', error);
    throw error;
  }
};

export const addCompanyMarketingAsset = async (companyId, userId, assetData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const assetsRef = collection(db, 'companies', companyId, 'marketingAssets');
    
    const newAsset = {
      assetName: assetData.assetName || '',
      assetType: assetData.assetType || 'image', // 'image', 'video', 'document', 'template', 'other'
      assetUrl: assetData.assetUrl || '',
      fileSize: assetData.fileSize || 0,
      mimeType: assetData.mimeType || '',
      tags: assetData.tags || [],
      campaignId: assetData.campaignId || '',
      notes: assetData.notes || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(assetsRef, newAsset);
    return docRef.id;
  } catch (error) {
    console.error('Error adding marketing asset:', error);
    throw error;
  }
};

export const deleteCompanyMarketingAsset = async (companyId, assetId) => {
  if (!companyId || !assetId) throw new Error('Company ID and asset ID are required');
  try {
    const assetRef = doc(db, 'companies', companyId, 'marketingAssets', assetId);
    await deleteDoc(assetRef);
    return true;
  } catch (error) {
    console.error('Error deleting marketing asset:', error);
    throw error;
  }
};

// ==================== MARKETING LEADS ====================

export const getCompanyLeads = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const leadsRef = collection(db, 'companies', companyId, 'leads');
    let q = query(leadsRef);
    
    if (options.status) {
      q = query(q, where('leadStatus', '==', options.status));
    }
    if (options.source) {
      q = query(q, where('leadSource', '==', options.source));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Error getting leads:', error);
    throw error;
  }
};

export const addCompanyLead = async (companyId, userId, leadData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const leadsRef = collection(db, 'companies', companyId, 'leads');
    
    const newLead = {
      leadName: leadData.leadName || '',
      leadEmail: leadData.leadEmail || '',
      leadPhone: leadData.leadPhone || '',
      leadCompany: leadData.leadCompany || '',
      leadSource: leadData.leadSource || '', // 'website', 'social', 'referral', 'event', 'other'
      leadStatus: leadData.leadStatus || 'new', // 'new', 'contacted', 'qualified', 'converted', 'lost'
      campaignId: leadData.campaignId || '',
      notes: leadData.notes || '',
      tags: leadData.tags || [],
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(leadsRef, newLead);
    return docRef.id;
  } catch (error) {
    console.error('Error adding lead:', error);
    throw error;
  }
};

export const updateCompanyLead = async (companyId, leadId, leadData = {}) => {
  if (!companyId || !leadId) throw new Error('Company ID and lead ID are required');
  try {
    const leadRef = doc(db, 'companies', companyId, 'leads', leadId);
    await updateDoc(leadRef, {
      ...leadData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
};

export const deleteCompanyLead = async (companyId, leadId) => {
  if (!companyId || !leadId) throw new Error('Company ID and lead ID are required');
  try {
    const leadRef = doc(db, 'companies', companyId, 'leads', leadId);
    await deleteDoc(leadRef);
    return true;
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
};

// ============================================
// PROJECTS MODULE
// ============================================

/**
 * Get all projects for a company
 */
export const getCompanyProjects = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const projectsRef = collection(db, 'companies', companyId, 'projects');
    let q = query(projectsRef);
    
    // Only add orderBy if explicitly requested or if not disabled
    if (options.orderBy !== null) {
      if (options.orderBy) {
        q = query(q, orderBy(options.orderBy, options.orderDirection || 'desc'));
      } else {
        // Try to order by createdAt, but fallback if index doesn't exist
        try {
          q = query(q, orderBy('createdAt', 'desc'));
        } catch (orderError) {
          // If orderBy fails (missing index), continue without ordering
          console.warn('Could not order by createdAt, missing index. Continuing without order...');
        }
      }
    }
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const snapshot = await getDocs(q);
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // If we couldn't order by createdAt, sort in memory
    if (options.orderBy === null || (!options.orderBy && projects.length > 0)) {
      try {
        projects.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return bTime - aTime;
        });
      } catch (sortError) {
        // If sorting fails, just return unsorted
        console.warn('Could not sort projects:', sortError);
      }
    }
    
    return projects;
  } catch (error) {
    console.error('Error getting projects:', error);
    // If it's an index error, try without orderBy
    if (error.message && error.message.includes('index')) {
      try {
        const projectsRef = collection(db, 'companies', companyId, 'projects');
        const q = query(projectsRef);
        const snapshot = await getDocs(q);
        const projects = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort in memory
        projects.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return bTime - aTime;
        });
        return projects;
      } catch (retryError) {
        console.error('Error getting projects (retry):', retryError);
        throw retryError;
      }
    }
    throw error;
  }
};

/**
 * Add a new project
 */
export const addCompanyProject = async (companyId, userId, projectData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const projectsRef = collection(db, 'companies', companyId, 'projects');
    
    // Convert date strings to Timestamps
    const processedData = { ...projectData };
    if (projectData.startDate && typeof projectData.startDate === 'string') {
      processedData.startDate = Timestamp.fromDate(new Date(projectData.startDate));
    }
    if (projectData.endDate && typeof projectData.endDate === 'string') {
      processedData.endDate = Timestamp.fromDate(new Date(projectData.endDate));
    }
    
    const newProject = {
      name: processedData.name || '',
      description: processedData.description || '',
      type: processedData.type || 'app',
      status: processedData.status || 'planning',
      phase: processedData.phase || '',
      priority: processedData.priority || 'medium',
      startDate: processedData.startDate || null,
      endDate: processedData.endDate || null,
      budget: parseFloat(processedData.budget) || 0,
      actualCost: parseFloat(processedData.actualCost) || 0,
      assignedTo: processedData.assignedTo || '',
      parentProjectId: processedData.parentProjectId || null,
      tags: processedData.tags || [],
      customFields: processedData.customFields || {},
      notes: processedData.notes || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };
    
    const docRef = await addDoc(projectsRef, newProject);
    return docRef.id;
  } catch (error) {
    console.error('Error adding project:', error);
    throw error;
  }
};

/**
 * Update a project
 */
export const updateCompanyProject = async (companyId, projectId, projectData = {}) => {
  if (!companyId || !projectId) throw new Error('Company ID and project ID are required');
  try {
    const projectRef = doc(db, 'companies', companyId, 'projects', projectId);
    
    // Convert date strings to Timestamps
    const processedData = { ...projectData };
    if (projectData.startDate && typeof projectData.startDate === 'string') {
      processedData.startDate = Timestamp.fromDate(new Date(projectData.startDate));
    }
    if (projectData.endDate && typeof projectData.endDate === 'string') {
      processedData.endDate = Timestamp.fromDate(new Date(projectData.endDate));
    }
    
    // Convert budget and actualCost to numbers
    if (projectData.budget !== undefined) {
      processedData.budget = parseFloat(projectData.budget) || 0;
    }
    if (projectData.actualCost !== undefined) {
      processedData.actualCost = parseFloat(projectData.actualCost) || 0;
    }
    
    const updateData = {
      ...processedData,
      updatedAt: serverTimestamp()
    };
    
    // Remove fields that shouldn't be updated
    delete updateData.createdAt;
    delete updateData.createdBy;
    
    await updateDoc(projectRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

/**
 * Delete a project (and optionally its children)
 */
export const deleteCompanyProject = async (companyId, projectId) => {
  if (!companyId || !projectId) throw new Error('Company ID and project ID are required');
  try {
    const projectRef = doc(db, 'companies', companyId, 'projects', projectId);
    
    // Get all child projects
    const projectsRef = collection(db, 'companies', companyId, 'projects');
    const childQuery = query(projectsRef, where('parentProjectId', '==', projectId));
    const childSnapshot = await getDocs(childQuery);
    
    // Delete all child projects first
    const batch = writeBatch(db);
    childSnapshot.docs.forEach(childDoc => {
      batch.delete(childDoc.ref);
    });
    
    // Delete the project itself
    batch.delete(projectRef);
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

/**
 * Get project configuration for a company
 */
export const getCompanyProjectConfig = async (companyId) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const configRef = doc(db, 'companies', companyId, 'settings', 'projectConfig');
    const configDoc = await getDoc(configRef);
    
    if (configDoc.exists()) {
      return configDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting project config:', error);
    throw error;
  }
};

/**
 * Update project configuration for a company
 */
export const updateCompanyProjectConfig = async (companyId, configData) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const configRef = doc(db, 'companies', companyId, 'settings', 'projectConfig');
    await setDoc(configRef, {
      ...configData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating project config:', error);
    throw error;
  }
};

// ============================================
// FORECASTING & BUDGETING MODULE
// ============================================

/**
 * Get all budgets for a company
 */
export const getCompanyBudgets = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const budgetsRef = collection(db, 'companies', companyId, 'budgets');
    let q = query(budgetsRef);
    
    if (options.orderBy) {
      q = query(q, orderBy(options.orderBy, options.orderDirection || 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting budgets:', error);
    throw error;
  }
};

/**
 * Add a new budget
 */
export const addCompanyBudget = async (companyId, userId, budgetData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const budgetsRef = collection(db, 'companies', companyId, 'budgets');
    
    // Convert date strings to Timestamps
    const processedData = { ...budgetData };
    if (budgetData.startDate && typeof budgetData.startDate === 'string') {
      processedData.startDate = Timestamp.fromDate(new Date(budgetData.startDate));
    }
    if (budgetData.endDate && typeof budgetData.endDate === 'string') {
      processedData.endDate = Timestamp.fromDate(new Date(budgetData.endDate));
    }
    
    const newBudget = {
      name: processedData.name || '',
      type: 'budget',
      category: processedData.category || '',
      period: processedData.period || 'month',
      startDate: processedData.startDate || null,
      endDate: processedData.endDate || null,
      amount: parseFloat(processedData.amount) || 0,
      description: processedData.description || '',
      notes: processedData.notes || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };
    
    const docRef = await addDoc(budgetsRef, newBudget);
    return docRef.id;
  } catch (error) {
    console.error('Error adding budget:', error);
    throw error;
  }
};

/**
 * Update a budget
 */
export const updateCompanyBudget = async (companyId, budgetId, budgetData = {}) => {
  if (!companyId || !budgetId) throw new Error('Company ID and budget ID are required');
  try {
    const budgetRef = doc(db, 'companies', companyId, 'budgets', budgetId);
    
    // Convert date strings to Timestamps
    const processedData = { ...budgetData };
    if (budgetData.startDate && typeof budgetData.startDate === 'string') {
      processedData.startDate = Timestamp.fromDate(new Date(budgetData.startDate));
    }
    if (budgetData.endDate && typeof budgetData.endDate === 'string') {
      processedData.endDate = Timestamp.fromDate(new Date(budgetData.endDate));
    }
    
    // Convert amount to number
    if (budgetData.amount !== undefined) {
      processedData.amount = parseFloat(budgetData.amount) || 0;
    }
    
    const updateData = {
      ...processedData,
      updatedAt: serverTimestamp()
    };
    
    // Remove fields that shouldn't be updated
    delete updateData.createdAt;
    delete updateData.createdBy;
    
    await updateDoc(budgetRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating budget:', error);
    throw error;
  }
};

/**
 * Delete a budget
 */
export const deleteCompanyBudget = async (companyId, budgetId) => {
  if (!companyId || !budgetId) throw new Error('Company ID and budget ID are required');
  try {
    const budgetRef = doc(db, 'companies', companyId, 'budgets', budgetId);
    await deleteDoc(budgetRef);
    return true;
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
};

/**
 * Get all forecasts for a company
 */
export const getCompanyForecasts = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const forecastsRef = collection(db, 'companies', companyId, 'forecasts');
    let q = query(forecastsRef);
    
    if (options.orderBy) {
      q = query(q, orderBy(options.orderBy, options.orderDirection || 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting forecasts:', error);
    throw error;
  }
};

/**
 * Add a new forecast
 */
export const addCompanyForecast = async (companyId, userId, forecastData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const forecastsRef = collection(db, 'companies', companyId, 'forecasts');
    
    // Convert date strings to Timestamps
    const processedData = { ...forecastData };
    if (forecastData.startDate && typeof forecastData.startDate === 'string') {
      processedData.startDate = Timestamp.fromDate(new Date(forecastData.startDate));
    }
    if (forecastData.endDate && typeof forecastData.endDate === 'string') {
      processedData.endDate = Timestamp.fromDate(new Date(forecastData.endDate));
    }
    
    const newForecast = {
      name: processedData.name || '',
      type: 'forecast',
      category: processedData.category || '',
      period: processedData.period || 'month',
      startDate: processedData.startDate || null,
      endDate: processedData.endDate || null,
      amount: parseFloat(processedData.amount) || 0,
      description: processedData.description || '',
      status: processedData.status || 'active',
      notes: processedData.notes || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };
    
    const docRef = await addDoc(forecastsRef, newForecast);
    return docRef.id;
  } catch (error) {
    console.error('Error adding forecast:', error);
    throw error;
  }
};

/**
 * Update a forecast
 */
export const updateCompanyForecast = async (companyId, forecastId, forecastData = {}) => {
  if (!companyId || !forecastId) throw new Error('Company ID and forecast ID are required');
  try {
    const forecastRef = doc(db, 'companies', companyId, 'forecasts', forecastId);
    
    // Convert date strings to Timestamps
    const processedData = { ...forecastData };
    if (forecastData.startDate && typeof forecastData.startDate === 'string') {
      processedData.startDate = Timestamp.fromDate(new Date(forecastData.startDate));
    }
    if (forecastData.endDate && typeof forecastData.endDate === 'string') {
      processedData.endDate = Timestamp.fromDate(new Date(forecastData.endDate));
    }
    
    // Convert amount to number
    if (forecastData.amount !== undefined) {
      processedData.amount = parseFloat(forecastData.amount) || 0;
    }
    
    const updateData = {
      ...processedData,
      updatedAt: serverTimestamp()
    };
    
    // Remove fields that shouldn't be updated
    delete updateData.createdAt;
    delete updateData.createdBy;
    
    await updateDoc(forecastRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating forecast:', error);
    throw error;
  }
};

/**
 * Delete a forecast
 */
export const deleteCompanyForecast = async (companyId, forecastId) => {
  if (!companyId || !forecastId) throw new Error('Company ID and forecast ID are required');
  try {
    const forecastRef = doc(db, 'companies', companyId, 'forecasts', forecastId);
    await deleteDoc(forecastRef);
    return true;
  } catch (error) {
    console.error('Error deleting forecast:', error);
    throw error;
  }
};

// ============================================
// NOTIFICATIONS MODULE
// ============================================

/**
 * Get notifications for a company/user
 */
export const getCompanyNotifications = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const notificationsRef = collection(db, 'companies', companyId, 'notifications');
    let q = query(notificationsRef);
    
    // Filter by user if specified
    if (options.userId) {
      q = query(q, where('userId', '==', options.userId));
    }
    
    // Filter unread only if specified
    if (options.unreadOnly) {
      q = query(q, where('read', '==', false));
    }
    
    // Order by creation date
    q = query(q, orderBy('createdAt', 'desc'));
    
    // Limit if specified
    if (options.limit) {
      q = query(q, limit(options.limit));
    } else {
      q = query(q, limit(50)); // Default limit
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

/**
 * Subscribe to notifications in real-time
 */
export const subscribeToCompanyNotifications = (companyId, userId, callback) => {
  if (!companyId) return () => {};
  
  try {
    const notificationsRef = collection(db, 'companies', companyId, 'notifications');
    let q = query(notificationsRef);
    
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    
    q = query(q, orderBy('createdAt', 'desc'), limit(50));
    
    return onSnapshot(q, 
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(notifications);
      },
      (error) => {
        // Handle missing index errors gracefully
        if (error.message?.includes('index') || error.code === 'failed-precondition') {
          console.warn('Notifications index not ready. Index will be created automatically.');
          callback([]); // Return empty array while index builds
        } else {
          console.error('Error in notifications subscription:', error);
          callback([]);
        }
      }
    );
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return () => {};
  }
};

/**
 * Create a notification
 */
export const createCompanyNotification = async (companyId, notificationData = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const notificationsRef = collection(db, 'companies', companyId, 'notifications');
    
    const newNotification = {
      type: notificationData.type || 'system', // 'overdue_invoice', 'approval_request', 'budget_alert', 'payment_reminder', 'contract_expiration', 'domain_expiration', 'subscription_renewal', 'payment_due', 'system'
      title: notificationData.title || '',
      message: notificationData.message || '',
      userId: notificationData.userId || null, // null = all users
      read: false,
      actionUrl: notificationData.actionUrl || null,
      metadata: notificationData.metadata || {},
      priority: notificationData.priority || 'normal', // 'low', 'normal', 'high', 'urgent'
      expiresAt: notificationData.expiresAt || null, // When the notification becomes irrelevant
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(notificationsRef, newNotification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (companyId, notificationId) => {
  if (!companyId || !notificationId) throw new Error('Company ID and notification ID are required');
  try {
    const notificationRef = doc(db, 'companies', companyId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (companyId, userId) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const notificationsRef = collection(db, 'companies', companyId, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      const notificationRef = doc(db, 'companies', companyId, 'notifications', doc.id);
      batch.update(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 */
export const deleteCompanyNotification = async (companyId, notificationId) => {
  if (!companyId || !notificationId) throw new Error('Company ID and notification ID are required');
  try {
    const notificationRef = doc(db, 'companies', companyId, 'notifications', notificationId);
    await deleteDoc(notificationRef);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// ==================== COLLABORATION & DATA SHARING ====================

/**
 * Get collaboration workspace
 */
export const getCollaborationWorkspace = async (companyId, workspaceId) => {
  if (!companyId || !workspaceId) throw new Error('Company ID and workspace ID are required');
  try {
    const workspaceRef = doc(db, 'companies', companyId, 'collaborationWorkspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    if (!workspaceSnap.exists()) return null;
    return { id: workspaceSnap.id, ...workspaceSnap.data() };
  } catch (error) {
    console.error('Error getting collaboration workspace:', error);
    throw error;
  }
};

/**
 * Get all collaboration workspaces for a company
 */
export const getCompanyCollaborationWorkspaces = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const workspacesRef = collection(db, 'companies', companyId, 'collaborationWorkspaces');
    let q = query(workspacesRef);
    
    if (options.type) {
      q = query(q, where('type', '==', options.type));
    }
    if (options.departments) {
      q = query(q, where('departments', 'array-contains-any', options.departments));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting collaboration workspaces:', error);
    throw error;
  }
};

/**
 * Create collaboration workspace
 */
export const createCollaborationWorkspace = async (companyId, userId, workspaceData = {}) => {
  if (!companyId || !userId) throw new Error('Company ID and user ID are required');
  try {
    const workspacesRef = collection(db, 'companies', companyId, 'collaborationWorkspaces');
    
    const newWorkspace = {
      name: workspaceData.name || '',
      type: workspaceData.type || 'project_launch',
      description: workspaceData.description || '',
      departments: workspaceData.departments || [],
      sharingConfig: workspaceData.sharingConfig || {},
      linkedProjectId: workspaceData.linkedProjectId || null,
      linkedCampaignId: workspaceData.linkedCampaignId || null,
      members: workspaceData.members || [userId],
      status: workspaceData.status || 'active',
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(workspacesRef, newWorkspace);
    return docRef.id;
  } catch (error) {
    console.error('Error creating collaboration workspace:', error);
    throw error;
  }
};

/**
 * Add activity to collaboration feed
 */
export const addCollaborationActivity = async (companyId, activityData = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const activitiesRef = collection(db, 'companies', companyId, 'collaborationActivities');
    
    const activity = {
      type: activityData.type || 'project_updated',
      sourceDepartment: activityData.sourceDepartment || '',
      targetDepartments: activityData.targetDepartments || [],
      title: activityData.title || '',
      description: activityData.description || '',
      linkedResourceType: activityData.linkedResourceType || null, // 'project', 'campaign', etc.
      linkedResourceId: activityData.linkedResourceId || null,
      metadata: activityData.metadata || {},
      createdBy: activityData.createdBy || '',
      createdAt: serverTimestamp(),
      readBy: []
    };
    
    const docRef = await addDoc(activitiesRef, activity);
    return docRef.id;
  } catch (error) {
    console.error('Error adding collaboration activity:', error);
    throw error;
  }
};

/**
 * Get collaboration activities
 */
export const getCollaborationActivities = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const activitiesRef = collection(db, 'companies', companyId, 'collaborationActivities');
    let q = query(activitiesRef);
    
    if (options.department) {
      q = query(q, where('targetDepartments', 'array-contains', options.department));
    }
    if (options.type) {
      q = query(q, where('type', '==', options.type));
    }
    if (options.linkedResourceType && options.linkedResourceId) {
      q = query(q, 
        where('linkedResourceType', '==', options.linkedResourceType),
        where('linkedResourceId', '==', options.linkedResourceId)
      );
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting collaboration activities:', error);
    throw error;
  }
};

/**
 * Link project to campaign for collaboration
 */
export const linkProjectToCampaign = async (companyId, projectId, campaignId, userId) => {
  if (!companyId || !projectId || !campaignId) {
    throw new Error('Company ID, project ID, and campaign ID are required');
  }
  try {
    const batch = writeBatch(db);
    
    // Update project with campaign link
    const projectRef = doc(db, 'companies', companyId, 'projects', projectId);
    batch.update(projectRef, {
      linkedCampaignId: campaignId,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
    
    // Update campaign with project link
    const campaignRef = doc(db, 'companies', companyId, 'campaigns', campaignId);
    batch.update(campaignRef, {
      linkedProjectId: projectId,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
    
    await batch.commit();
    
    // Create activity notification
    await addCollaborationActivity(companyId, {
      type: 'project_campaign_linked',
      sourceDepartment: 'projects',
      targetDepartments: ['marketing'],
      title: 'Project and Campaign Linked',
      description: 'A project has been linked to a marketing campaign for collaboration',
      linkedResourceType: 'project',
      linkedResourceId: projectId,
      metadata: { campaignId },
      createdBy: userId
    });
    
    return true;
  } catch (error) {
    console.error('Error linking project to campaign:', error);
    throw error;
  }
};

/**
 * Unlink project from campaign
 */
export const unlinkProjectFromCampaign = async (companyId, projectId, campaignId, userId) => {
  if (!companyId || !projectId || !campaignId) {
    throw new Error('Company ID, project ID, and campaign ID are required');
  }
  try {
    const batch = writeBatch(db);
    
    // Remove project link from campaign
    const projectRef = doc(db, 'companies', companyId, 'projects', projectId);
    batch.update(projectRef, {
      linkedCampaignId: null,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
    
    // Remove campaign link from project
    const campaignRef = doc(db, 'companies', companyId, 'campaigns', campaignId);
    batch.update(campaignRef, {
      linkedProjectId: null,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
    
    await batch.commit();
    
    // Create activity notification
    await addCollaborationActivity(companyId, {
      type: 'project_campaign_unlinked',
      sourceDepartment: 'marketing',
      targetDepartments: ['projects'],
      title: 'Project and Campaign Unlinked',
      description: 'A project has been unlinked from a marketing campaign',
      linkedResourceType: 'project',
      linkedResourceId: projectId,
      metadata: { campaignId },
      createdBy: userId
    });
    
    return true;
  } catch (error) {
    console.error('Error unlinking project from campaign:', error);
    throw error;
  }
};

/**
 * Add user feedback to collaboration system
 */
export const addUserFeedback = async (companyId, feedbackData = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const feedbackRef = collection(db, 'companies', companyId, 'userFeedback');
    
    const feedback = {
      source: feedbackData.source || 'app', // 'app', 'email', 'support', 'survey'
      type: feedbackData.type || 'general', // 'bug', 'feature', 'improvement', 'complaint', 'praise'
      category: feedbackData.category || '',
      title: feedbackData.title || '',
      description: feedbackData.description || '',
      userEmail: feedbackData.userEmail || '',
      userId: feedbackData.userId || null,
      linkedProjectId: feedbackData.linkedProjectId || null,
      linkedCampaignId: feedbackData.linkedCampaignId || null,
      priority: feedbackData.priority || 'medium',
      status: feedbackData.status || 'new',
      assignedTo: feedbackData.assignedTo || null,
      tags: feedbackData.tags || [],
      metadata: feedbackData.metadata || {},
      createdAt: serverTimestamp(),
      createdBy: feedbackData.createdBy || '',
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(feedbackRef, feedback);
    
    // Notify relevant departments
    await addCollaborationActivity(companyId, {
      type: 'user_feedback_received',
      sourceDepartment: 'support',
      targetDepartments: ['marketing', 'projects'],
      title: `New ${feedback.type} feedback`,
      description: feedback.title || feedback.description,
      linkedResourceType: 'feedback',
      linkedResourceId: docRef.id,
      metadata: { priority: feedback.priority, category: feedback.category },
      createdBy: feedback.createdBy || ''
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding user feedback:', error);
    throw error;
  }
};

/**
 * Get user feedback
 */
export const getUserFeedback = async (companyId, options = {}) => {
  if (!companyId) throw new Error('Company ID is required');
  try {
    const feedbackRef = collection(db, 'companies', companyId, 'userFeedback');
    let q = query(feedbackRef);
    
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    if (options.type) {
      q = query(q, where('type', '==', options.type));
    }
    if (options.linkedProjectId) {
      q = query(q, where('linkedProjectId', '==', options.linkedProjectId));
    }
    if (options.linkedCampaignId) {
      q = query(q, where('linkedCampaignId', '==', options.linkedCampaignId));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user feedback:', error);
    throw error;
  }
};

// Export auth, db, and storage instances
export { app, auth, db, storage };