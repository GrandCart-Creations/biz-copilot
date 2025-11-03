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
  serverTimestamp,
  setDoc,
  writeBatch,
  Timestamp
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
import { encryptSensitiveFields, decryptSensitiveFields } from './utils/encryption';

// Firebase configuration from environment variables
// In production, these should be set via environment variables
// For development, fallback to hardcoded values (will be removed in production)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDvSZZ1rWL8eAaTrRtMAsBj1D1rxp34zVo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "expense-tracker-prod-475813.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "expense-tracker-prod-475813",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "expense-tracker-prod-475813.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "366675970251",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:366675970251:web:b31fe0f2ea3930d388734e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CVCYBMQ2SY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

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
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
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
    const encryptedData = await encryptSensitiveFields(expenseData, sensitiveFields);
    
    const expenseRef = doc(db, 'companies', companyId, 'expenses', expenseId);
    await updateDoc(expenseRef, {
      ...encryptedData,
      updatedAt: serverTimestamp()
    });
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
export const inviteUserToCompany = async (companyId, email, role = 'employee', invitedBy) => {
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
    const invitationRef = await addDoc(invitationsRef, {
      email: email.toLowerCase().trim(),
      role,
      status: 'pending',
      invitedBy,
      companyId,
      invitedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
      acceptedAt: null,
      acceptedBy: null
    });
    
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
      } catch (queryError) {
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
export const findUserByEmail = async (email) => {
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
    
    // Update account balance if financial account is linked
    if (incomeData.financialAccountId && incomeData.amount) {
      const amount = parseFloat(incomeData.amount || 0);
      if (amount > 0) {
        try {
          await updateAccountBalance(companyId, incomeData.financialAccountId, amount, 'income');
        } catch (balanceError) {
          console.error('Error updating account balance:', balanceError);
          // Don't fail the income creation if balance update fails
        }
      }
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
    
    // Update account balances if financial account changed or amount changed
    const oldAmount = parseFloat(existingData.amount || 0);
    const newAmount = parseFloat(incomeData.amount || oldAmount);
    const oldAccountId = existingData.financialAccountId || '';
    const newAccountId = incomeData.financialAccountId || oldAccountId;
    
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
    // Get existing income to reverse balance update
    const incomeRef = doc(db, 'companies', companyId, 'income', incomeId);
    const incomeDoc = await getDoc(incomeRef);
    
    if (incomeDoc.exists()) {
      const incomeData = incomeDoc.data();
      
      // Reverse account balance if financial account was linked
      if (incomeData.financialAccountId && incomeData.amount) {
        const amount = parseFloat(incomeData.amount || 0);
        if (amount > 0) {
          try {
            await updateAccountBalance(companyId, incomeData.financialAccountId, -amount, 'income');
          } catch (balanceError) {
            console.error('Error reversing account balance:', balanceError);
            // Continue with deletion even if balance update fails
          }
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

// Export auth, db, and storage instances
export { auth, db, storage };