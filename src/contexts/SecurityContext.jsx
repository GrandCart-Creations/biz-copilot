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
import { logAuditEvent, AUDIT_EVENTS } from '../utils/auditLog';
import { 
  generateMFASecret, 
  verifyMFACode, 
  disableMFA as disableMFAUtil,
  isMFAEnabled as checkMFAEnabled,
  verifyBackupCode
} from '../utils/mfa';

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

  // Load MFA status on mount
  useEffect(() => {
    const loadMFAStatus = async () => {
      if (currentUser?.uid) {
        const enabled = await checkMFAEnabled(currentUser.uid);
        setMfaEnabled(enabled);
      }
    };
    loadMFAStatus();
  }, [currentUser]);

  // Enable MFA for user
  const enableMFA = async () => {
    try {
      if (!currentUser?.uid || !currentUser?.email) {
        throw new Error('User not authenticated');
      }

      // Generate real MFA secret and QR code
      const result = await generateMFASecret(currentUser.uid, currentUser.email);
      
      await logAuditEvent(AUDIT_EVENTS.MFA_ENABLED, {
        userId: currentUser.uid,
        email: currentUser.email
      }, 'success');
      
      return {
        success: true,
        message: 'MFA setup initiated. Please verify with your authenticator app.',
        qrCode: result.qrCode,
        otpAuthUrl: result.otpAuthUrl,
        // Backup codes will be provided after verification
        backupCodes: []
      };
    } catch (error) {
      console.error('Error enabling MFA:', error);
      throw error;
    }
  };

  // Disable MFA for user
  const disableMFA = async () => {
    try {
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      await disableMFAUtil(currentUser.uid);
      setMfaEnabled(false);
      
      await logAuditEvent(AUDIT_EVENTS.MFA_DISABLED, {
        userId: currentUser.uid,
        email: currentUser.email
      }, 'warning');
      
      return { success: true, message: 'MFA disabled successfully' };
    } catch (error) {
      console.error('Error disabling MFA:', error);
      throw error;
    }
  };

  // Verify MFA code (TOTP or backup code)
  const verifyMFA = async (code) => {
    try {
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      // Check if it's a 6-digit TOTP code or backup code
      if (/^\d{6}$/.test(code)) {
        // TOTP code
        const result = await verifyMFACode(currentUser.uid, code);
        
        if (result.valid) {
          // First verification - enable MFA
          if (result.backupCodes) {
            setMfaEnabled(true);
            await logAuditEvent(AUDIT_EVENTS.MFA_ENABLED, {
              userId: currentUser.uid,
              email: currentUser.email,
              verified: true
            }, 'success');
            
            return {
              valid: true,
              backupCodes: result.backupCodes,
              message: 'MFA verified and enabled!'
            };
          } else {
            // Subsequent verification
            return { valid: true };
          }
        }
        
        return { valid: false, error: 'Invalid code. Please try again.' };
      } else {
        // Backup code (8 characters)
        const isValid = await verifyBackupCode(currentUser.uid, code);
        
        if (isValid) {
          return { valid: true, usedBackupCode: true };
        }
        
        return { valid: false, error: 'Invalid backup code.' };
      }
    } catch (error) {
      console.error('Error verifying MFA:', error);
      return { valid: false, error: error.message };
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
