/**
 * EMAIL VERIFICATION BANNER
 * 
 * Standalone component for displaying email verification status.
 * Rendered only once in MainLayout to avoid duplicate banners.
 */

import React, { useState, useEffect } from 'react';
import { resendVerificationEmail, checkEmailVerification, getCurrentUser } from '../firebase';

const EmailVerificationBanner = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Check verification status on mount and periodically
  useEffect(() => {
    let mounted = true;
    let interval;

    const checkVerification = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          if (mounted) {
            setUser(null);
            setShowVerificationBanner(false);
          }
          return;
        }

        // Only check if user exists and email is not verified locally
        if (currentUser.emailVerified) {
          if (mounted) {
            setUser(currentUser);
            setShowVerificationBanner(false);
            setVerificationMessage('');
          }
          return;
        }

        // Check with server (but don't do this too frequently)
        try {
          const verificationStatus = await checkEmailVerification();
          if (mounted) {
            setUser(getCurrentUser());
            if (verificationStatus.verified) {
              setShowVerificationBanner(false);
              setVerificationMessage('');
            } else if (!dismissed) {
              setShowVerificationBanner(true);
            }
          }
        } catch (error) {
          // Handle specific Firebase errors gracefully
          const errorMessage = error.message || '';
          const isBlockedError = errorMessage.includes('granttoken-are-blocked') || 
                                 errorMessage.includes('network') ||
                                 errorMessage.includes('Failed to check');
          
          if (isBlockedError) {
            // Don't spam console with expected rate-limiting errors
            console.debug('Verification check temporarily blocked, will retry later');
          } else {
            console.warn('Verification check failed:', error.message);
          }
          
          // Use local status as fallback
          if (mounted && !currentUser.emailVerified && !dismissed) {
            setUser(currentUser);
            setShowVerificationBanner(true);
          }
        }
      } catch (error) {
        console.error('Error in verification check:', error);
      }
    };

    // Initial check after a short delay to avoid blocking
    const initialTimeout = setTimeout(checkVerification, 1000);

    // Only set up interval if banner is showing and not dismissed
    if (showVerificationBanner && !dismissed) {
      interval = setInterval(checkVerification, 60000); // Check every 60 seconds instead of 30
    }

    return () => {
      mounted = false;
      clearTimeout(initialTimeout);
      if (interval) clearInterval(interval);
    };
  }, [showVerificationBanner, dismissed]);

  const handleResendVerification = async () => {
    // Confirm before resending since it invalidates previous links
    const confirmResend = window.confirm(
      '⚠️ Sending a new verification email will INVALIDATE any previous verification links.\n\n' +
      'If you already have a verification email (sent within the last 6 hours), use that link instead.\n\n' +
      'Do you want to send a new verification email?'
    );
    
    if (!confirmResend) return;
    
    setLoading(true);
    setVerificationMessage('');
    try {
      const message = await resendVerificationEmail();
      setVerificationMessage('✓ New verification email sent! The link is valid for 6 hours. Check your inbox and spam folder.');
    } catch (error) {
      setVerificationMessage(error.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    setVerificationMessage('');
    try {
      const status = await checkEmailVerification();
      const currentUser = getCurrentUser();
      setUser(currentUser);

      if (status.verified) {
        setVerificationMessage('✓ Your email is now verified!');
        setShowVerificationBanner(false);
      } else if (status.cached) {
        // Server check was blocked, using cached status
        setVerificationMessage('Email not yet verified. If you just verified, please refresh the page or try again in a moment.');
      } else {
        setVerificationMessage('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      const errorMessage = error.message || '';
      // Handle blocked API requests gracefully
      if (errorMessage.includes('granttoken-are-blocked') || errorMessage.includes('blocked')) {
        setVerificationMessage('Unable to check status right now. If you just verified your email, please refresh the page.');
      } else {
        setVerificationMessage(errorMessage || 'Failed to check verification status. Please try again.');
      }
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowVerificationBanner(false);
    setVerificationMessage('');
  };

  if (!showVerificationBanner || dismissed) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 relative z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-800">
            <strong>Email not verified.</strong> Please check your inbox and verify your email address.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCheckVerification}
            disabled={checkingVerification || loading}
            className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50"
          >
            {checkingVerification ? 'Checking...' : 'Check Status'}
          </button>
          <button
            onClick={handleResendVerification}
            disabled={loading || checkingVerification}
            className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Resend Email'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-yellow-600 hover:text-yellow-800 ml-2"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {verificationMessage && (
        <div className="max-w-7xl mx-auto mt-2">
          <div className={`text-xs px-3 py-2 rounded ${
            verificationMessage.includes('✓') || verificationMessage.includes('already verified')
              ? 'bg-green-50 text-green-800'
              : 'bg-blue-50 text-blue-800'
          }`}>
            {verificationMessage}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto mt-2 text-xs text-yellow-700">
        <strong>⚠️ Important:</strong> Each "Resend Email" request <strong>invalidates ALL previous links</strong>. 
        Only click the link in the <strong>MOST RECENT</strong> email. Links are valid for <strong>6 hours</strong>. 
        Check your spam/junk folder if you don't see the email.
      </div>
    </div>
  );
};

export default EmailVerificationBanner;

