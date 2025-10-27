/**
 * SECURITY CONTEXT
 * 
 * Manages security-related state and operations:
 * - MFA (Multi-Factor Authentication) setup and verification
 * - Session management
 * - Security monitoring
 * - Login attempt tracking
 * 
 * Usage:
 * import { useSecurityContext } from '@/contexts/SecurityContext';
 * 
 * const { enableMFA, verifyMFA, sessionTimeout } = useSecurityContext();
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { logAuditEvent, AUDIT_EVENTS } from '@/utils/auditLog';

const SecurityContext = createContext();

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  
  // Session timeout configuration (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  // Track user activity for session management
  useEffect(() => {
    let timeoutId;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleSessionExpired();
      }, SESSION_TIMEOUT);
    };
    
    // Reset timeout on user activity
    const activities = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activities.forEach(activity => {
      window.addEventListener(activity, resetTimeout);
    });
    
    resetTimeout();
    
    return () => {
      clearTimeout(timeoutId);
      activities.forEach(activity => {
        window.removeEventListener(activity, resetTimeout);
      });
    };
  }, [currentUser]);

  // Handle session expiration
  const handleSessionExpired = async () => {
    setSessionActive(false);
    await logAuditEvent(AUDIT_EVENTS.USER_LOGOUT, {
      reason: 'session_timeout',
      email: currentUser?.email
    }, 'warning');
    
    // Could redirect to login or show re-auth modal
    window.location.href = '/login?session_expired=true';
  };

  // Track failed login attempts
  const handleFailedLogin = async (email) => {
    const attempts = loginAttempts + 1;
    setLoginAttempts(attempts);
    
    await logAuditEvent(AUDIT_EVENTS.FAILED_LOGIN, {
      email,
      attempts
    }, 'failure');
    
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      setIsAccountLocked(true);
      await logAuditEvent(AUDIT_EVENTS.ACCOUNT_LOCKED, {
        email,
        lockoutDuration: LOCKOUT_DURATION
      }, 'warning');
      
      // Unlock after lockout duration
      setTimeout(() => {
        setIsAccountLocked(false);
        setLoginAttempts(0);
      }, LOCKOUT_DURATION);
    }
  };

  // Reset login attempts on successful login
  const handleSuccessfulLogin = () => {
    setLoginAttempts(0);
    setIsAccountLocked(false);
  };

  // Enable MFA for user
  const enableMFA = async () => {
    try {
      // In production, this would:
      // 1. Generate a secret key
      // 2. Create QR code for authenticator app
      // 3. Store secret in secure backend
      
      // For now, simulating MFA setup
      setMfaEnabled(true);
      
      await logAuditEvent(AUDIT_EVENTS.MFA_ENABLED, {
        userId: currentUser?.uid,
        email: currentUser?.email
      }, 'success');
      
      return {
        success: true,
        message: 'MFA enabled successfully',
        // In production, return QR code and backup codes
        qrCode: 'data:image/png;base64,...',
        backupCodes: ['CODE1', 'CODE2', 'CODE3']
      };
    } catch (error) {
      console.error('Error enabling MFA:', error);
      throw error;
    }
  };

  // Disable MFA for user
  const disableMFA = async () => {
    try {
      setMfaEnabled(false);
      
      await logAuditEvent(AUDIT_EVENTS.MFA_DISABLED, {
        userId: currentUser?.uid,
        email: currentUser?.email
      }, 'warning');
      
      return { success: true, message: 'MFA disabled successfully' };
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw error;
    }
  };

  // Verify MFA code
  const verifyMFA = async (code) => {
    try {
      // In production, verify code against stored secret
      // For now, accept any 6-digit code
      if (!/^\d{6}$/.test(code)) {
        throw new Error('Invalid MFA code format');
      }
      
      // Simulate verification (in production, use authenticator library)
      const isValid = code.length === 6;
      
      if (isValid) {
        await logAuditEvent(AUDIT_EVENTS.USER_LOGIN, {
          userId: currentUser?.uid,
          email: currentUser?.email,
          mfaVerified: true
        }, 'success');
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying MFA:', error);
      return false;
    }
  };

  // Check for suspicious activity
  const checkSuspiciousActivity = async (activity) => {
    // Simple checks - in production, use more sophisticated detection
    const suspicious = {
      rapidRequests: activity.requestCount > 100, // requests per minute
      unusualLocation: activity.location !== currentUser?.lastLocation,
      unusualDevice: activity.device !== currentUser?.lastDevice,
    };
    
    if (Object.values(suspicious).some(Boolean)) {
      await logAuditEvent(AUDIT_EVENTS.SUSPICIOUS_ACTIVITY, {
        userId: currentUser?.uid,
        activity,
        flags: suspicious
      }, 'warning');
    }
  };

  const value = {
    // State
    mfaEnabled,
    sessionActive,
    loginAttempts,
    isAccountLocked,
    
    // MFA functions
    enableMFA,
    disableMFA,
    verifyMFA,
    
    // Security functions
    handleFailedLogin,
    handleSuccessfulLogin,
    checkSuspiciousActivity,
    
    // Constants
    MAX_LOGIN_ATTEMPTS,
    SESSION_TIMEOUT,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export default SecurityContext;
