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
    
    // Send email verification
    await sendEmailVerification(user);
    
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

// Resend email verification
export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in.');
    }
    if (user.emailVerified) {
      throw new Error('Your email is already verified.');
    }
    await sendEmailVerification(user);
    return 'Verification email sent! Check your inbox.';
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error(error.message);
  }
};

// Send email verification (accepts user object)
export const sendEmailVerificationToUser = async (user) => {
  try {
    if (!user) {
      throw new Error('User is required.');
    }
    if (user.emailVerified) {
      throw new Error('Your email is already verified.');
    }
    // Use the imported sendEmailVerification from firebase/auth
    await sendEmailVerification(user);
    return 'Verification email sent! Check your inbox.';
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error(error.message);
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
        const ledgerEntryId = await createExpenseLedgerEntry(
          companyId,
          expenseId,
          mergedData,
          expenseData.updatedBy || existingData.updatedBy || ''
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
      // Update existing pending invitation
      const existingInvite = pendingInvites[0];
      await updateDoc(doc(db, 'companies', companyId, 'invitations', existingInvite.id), {
        fullName: fullName.trim() || '',
        role,
        status: 'pending',
        invitedBy,
        invitedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
      });
      return existingInvite.id;
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
 * @param {string} newRole - New role (owner, manager, employee, accountant)
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
        accountant: ['expenses', 'income', 'reports']
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
    
    // Create user document in company
    const userRef = doc(db, 'companies', companyId, 'users', userId);
    const roleModules = {
      owner: ['expenses', 'income', 'marketing', 'forecasting', 'reports', 'settings', 'team'],
      manager: ['expenses', 'income', 'marketing', 'forecasting', 'reports'],
      employee: ['expenses'],
      accountant: ['expenses', 'income', 'reports']
    };
    
    batch.set(userRef, {
      email: userEmail,
      role: invitationData.role || 'employee',
      accessModules: roleModules[invitationData.role || 'employee'] || ['expenses'],
      subscriptionTier: invitationData.subscriptionTier || 'lite',
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

    for (const [accountId, adjustment] of ledgerAdjustments.entries()) {
      const accountRef = getLedgerAccountRef(companyId, accountId);
      const accountSnap = await transaction.get(accountRef);
      if (!accountSnap.exists()) {
        throw new Error(`Ledger account ${accountId} not found`);
      }
      const accountData = accountSnap.data();
      const meta = LEDGER_TYPE_META[accountData.type] || {};
      const normalBalance = accountData.normalBalance || meta.normalBalance || 'debit';
      const currentBalance = parseFloat(accountData.balance || 0);
      const currentDebit = parseFloat(accountData.debitTotal || 0);
      const currentCredit = parseFloat(accountData.creditTotal || 0);

      const balanceDelta = normalBalance === 'debit'
        ? adjustment.debit - adjustment.credit
        : adjustment.credit - adjustment.debit;

      transaction.update(accountRef, {
        balance: parseFloat((currentBalance + balanceDelta).toFixed(2)),
        debitTotal: parseFloat((currentDebit + adjustment.debit).toFixed(2)),
        creditTotal: parseFloat((currentCredit + adjustment.credit).toFixed(2)),
        updatedAt: serverTimestamp()
      });
    }

    for (const [financialAccountId, delta] of financialAdjustments.entries()) {
      const financialRef = doc(db, 'companies', companyId, 'financialAccounts', financialAccountId);
      const financialSnap = await transaction.get(financialRef);
      if (!financialSnap.exists()) {
        continue;
      }
      const currentBalance = parseFloat(financialSnap.data().currentBalance || 0);
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

// Export auth, db, and storage instances
export { app, auth, db, storage };