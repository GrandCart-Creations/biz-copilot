// src/components/EmailVerificationError.jsx
// Component to handle email verification errors gracefully

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkEmailVerification, getCurrentUser } from '../firebase';
import { FaExclamationTriangle, FaCheckCircle, FaEnvelope, FaSpinner } from 'react-icons/fa';

export default function EmailVerificationError() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null); // 'verified', 'error', 'checking'
  const [errorCode, setErrorCode] = useState(null);

  useEffect(() => {
    // Check if there's an error code in the URL
    const code = searchParams.get('error');
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (code) {
      setErrorCode(code);
      setStatus('error');
    } else if (mode === 'verifyEmail' && oobCode) {
      // Try to check verification status
      checkVerificationStatus();
    } else {
      // No specific error, just check status
      checkVerificationStatus();
    }
  }, [searchParams]);

  const checkVerificationStatus = async () => {
    setChecking(true);
    setStatus('checking');
    try {
      const result = await checkEmailVerification();
      if (result.verified) {
        setStatus('verified');
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setErrorCode('not_verified');
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      setStatus('error');
      setErrorCode('check_failed');
    } finally {
      setChecking(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (status === 'verified') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
          <p className="text-gray-600 mb-6">
            Your email address has been successfully verified. Redirecting to dashboard...
          </p>
          <button
            onClick={handleGoToDashboard}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Checking Verification Status</h1>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  // Error state
  const isApiKeyError = errorCode === '403' || errorCode === 'API_KEY_HTTP_REFERRER_BLOCKED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
            <FaExclamationTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Link Issue</h1>
            <p className="text-gray-600">
              {isApiKeyError
                ? 'There was a configuration issue with the verification link. This is a server-side setting that needs to be fixed.'
                : 'There was an issue verifying your email address.'}
            </p>
          </div>
        </div>

        {isApiKeyError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <FaExclamationTriangle className="w-5 h-5" />
              API Key Configuration Issue
            </h2>
            <p className="text-sm text-yellow-800 mb-4">
              The Firebase API key has HTTP referrer restrictions that are blocking verification requests from the Firebase hosting domain.
            </p>
            <div className="bg-white rounded p-4 mb-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">To fix this, you need to:</p>
              <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console → APIs & Services → Credentials</a></li>
                <li>Find your Firebase API key (starts with <code className="bg-gray-100 px-1 rounded">AIza...</code>)</li>
                <li>Click on the API key to edit it</li>
                <li>Under "Application restrictions", select "HTTP referrers (web sites)"</li>
                <li>Add these referrers:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><code className="bg-gray-100 px-1 rounded">https://expense-tracker-prod-475813.firebaseapp.com/*</code></li>
                    <li><code className="bg-gray-100 px-1 rounded">https://expense-tracker-prod-475813.web.app/*</code></li>
                    <li><code className="bg-gray-100 px-1 rounded">http://localhost:5173/*</code> (for development)</li>
                    <li><code className="bg-gray-100 px-1 rounded">http://localhost:3000/*</code> (for development)</li>
                  </ul>
                </li>
                <li>Click "Save"</li>
                <li>Wait 1-2 minutes for changes to propagate</li>
                <li>Try the verification link again</li>
              </ol>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> This is a one-time configuration fix. Once the API key is updated, all future verification links will work correctly.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-yellow-900 mb-3">What happened?</h2>
            <ul className="text-sm text-yellow-800 space-y-2 list-disc list-inside">
              <li>The verification link may have expired (links expire after 1 hour)</li>
              <li>The link may have already been used</li>
              <li>There may be a temporary server issue</li>
            </ul>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <FaEnvelope className="w-5 h-5" />
            What to do next
          </h2>
          <div className="space-y-3">
            {!isApiKeyError && (
              <>
                <p className="text-sm text-blue-800 mb-3">
                  You can request a new verification email from your dashboard:
                </p>
                <button
                  onClick={handleGoToDashboard}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard & Request New Email
                </button>
              </>
            )}
            {isApiKeyError && (
              <p className="text-sm text-blue-800">
                After fixing the API key configuration, you can request a new verification email from your dashboard.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGoToDashboard}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={checkVerificationStatus}
            disabled={checking}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check Status Again'}
          </button>
        </div>
      </div>
    </div>
  );
}

