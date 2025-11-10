// src/contexts/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { auth, logoutUser } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { logAuditEvent, AUDIT_EVENTS } from '../utils/auditLog';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const previousUserRef = useRef(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const previousUser = previousUserRef.current;

      if (user) {
        // Persist minimal user info for other utilities (e.g., audit logging)
        localStorage.setItem(
          'currentUser',
          JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || ''
          })
        );

        // Log login event if previous session was empty or different user
        if (!previousUser || previousUser.uid !== user.uid) {
          await logAuditEvent(
            AUDIT_EVENTS.USER_LOGIN,
            {
              email: user.email || 'unknown',
              displayName: user.displayName || '',
              provider: user.providerData?.[0]?.providerId || 'password'
            },
            'success',
            null,
            user.uid
          );
        }
      } else {
        // Clear stored user info
        localStorage.removeItem('currentUser');

        if (previousUser) {
          await logAuditEvent(
            AUDIT_EVENTS.USER_LOGOUT,
            {
              email: previousUser.email || 'unknown'
            },
            'success',
            null,
            previousUser.uid
          );
        }
      }

      previousUserRef.current = user || null;
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      if (currentUser) {
        await logAuditEvent(
          AUDIT_EVENTS.USER_LOGOUT,
          {
            email: currentUser.email || 'unknown'
          },
          'success',
          null,
          currentUser.uid
        );
      }

      await logoutUser();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value = {
    currentUser,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}