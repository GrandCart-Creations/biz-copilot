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
  setDoc
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

// ==================== FIREBASE STORAGE - FILE UPLOADS ====================

// Upload a file to Firebase Storage for an expense
export const uploadExpenseFile = async (userId, expenseId, file, onProgress = null) => {
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
    const filePath = `users/${userId}/expenses/${expenseId}/${fileName}`;

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

// Export auth, db, and storage instances
export { auth, db, storage };