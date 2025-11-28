/**
 * VERIFY EMAIL PAGE
 * 
 * Custom email verification handler with 6-hour token expiration.
 * Handles verification tokens sent via our custom email system.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaEnvelope, FaHome } from 'react-icons/fa';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please use the link from your verification email.');
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token) => {
    setStatus('verifying');
    setMessage('Verifying your email address...');

    try {
      const functions = getFunctions(undefined, 'europe-west1');
      const verifyEmailToken = httpsCallable(functions, 'verifyEmailToken');
      
      const result = await verifyEmailToken({ token });
      
      if (result.data.ok) {
        setStatus('success');
        setMessage(result.data.message || 'Email verified successfully!');
        setEmail(result.data.email || '');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.data.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      
      // Extract error message
      let errorMessage = 'Failed to verify email. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.details?.message) {
        errorMessage = error.details.message;
      }
      
      setMessage(errorMessage);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleResendEmail = () => {
    navigate('/dashboard');
  };

  // Verifying state
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Verifying Your Email</h1>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaCheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Email Verified!</h1>
          <p className="text-gray-600 mb-2">{message}</p>
          {email && (
            <p className="text-sm text-gray-500 mb-6">
              Verified: <strong>{email}</strong>
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">
            Redirecting to dashboard in 3 seconds...
          </p>
          <button
            onClick={handleGoToDashboard}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <FaHome className="w-5 h-5" />
            Go to Dashboard Now
          </button>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaTimesCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification Failed</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-yellow-800 mb-2">Common Reasons:</h2>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>The link has expired (links are valid for 6 hours)</li>
            <li>The link has already been used</li>
            <li>A newer verification email was sent</li>
            <li>The link was copied incorrectly</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <FaEnvelope className="w-4 h-4" />
            What to do next
          </h2>
          <p className="text-sm text-blue-700">
            Go to your dashboard and request a new verification email. Make sure to use the link from the <strong>most recent</strong> email within 6 hours.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoToDashboard}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <FaHome className="w-5 h-5" />
            Go to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

