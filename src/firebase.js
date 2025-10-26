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

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvSZZ1rWL8eAaTrRtMAsBj1D1rxp34zVo",
  authDomain: "expense-tracker-prod-475813.firebaseapp.com",
  projectId: "expense-tracker-prod-475813",
  storageBucket: "expense-tracker-prod-475813.firebasestorage.app",
  messagingSenderId: "366675970251",
  appId: "1:366675970251:web:b31fe0f2ea3930d388734e",
  measurementId: "G-CVCYBMQ2SY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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
    querySnapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return expenses;
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

// Add a new expense
export const addExpense = async (userId, expenseData) => {
  try {
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const docRef = await addDoc(expensesRef, {
      ...expenseData,
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
    const expenseRef = doc(db, 'users', userId, 'expenses', expenseId);
    await updateDoc(expenseRef, {
      ...expenseData,
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

// Export auth and db instances
export { auth, db };