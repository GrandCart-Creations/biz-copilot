/**
 * ACCEPT INVITATION COMPONENT
 * 
 * Handles invitation acceptance from email links
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { acceptInvitation, getCompanyInvitations } from '../firebase';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaSignOutAlt, FaInfoCircle } from 'react-icons/fa';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { switchCompany, loadUserCompanies } = useCompany();
  const { completeOnboarding } = useOnboarding();
  
  const companyId = searchParams.get('company');
  const invitationId = searchParams.get('invitation');
  
  const [status, setStatus] = useState('loading'); // loading, success, error, needsLogin
  const [message, setMessage] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    // Immediately mark that user is in invitation flow to prevent onboarding
    if (companyId && invitationId) {
      // Store flag to bypass onboarding
      sessionStorage.setItem('invitationFlow', 'true');
    }
    
    handleInvitationAcceptance();
  }, [companyId, invitationId, currentUser]);

  // Clean up sessionStorage after successful acceptance
  useEffect(() => {
    if (status === 'success') {
      // Cleanup happens in handleInvitationAcceptance, but also here as backup
      sessionStorage.removeItem('pendingInvitation');
      sessionStorage.removeItem('invitationRedirect');
      sessionStorage.removeItem('invitationFlow');
    }
  }, [status]);

  const handleInvitationAcceptance = async () => {
    if (!companyId || !invitationId) {
      setStatus('error');
      setMessage('Invalid invitation link. Missing company or invitation ID.');
      return;
    }

    // If user is not logged in, show login/signup prompt
    if (!currentUser) {
      setStatus('needsLogin');
      
      // CRITICAL: Ensure invitation flow flag is set BEFORE redirecting to login/signup
      // This prevents OnboardingContext from initializing onboarding during signup
      sessionStorage.setItem('invitationFlow', 'true');
      
      // Get invitation email to show in message
      // When user is not logged in, we can't read Firestore, so just show generic message
      // The invitation will be verified after they log in
      setMessage('Please log in to accept this invitation.');
      
      // Store invitation details from URL for redirect after login
      // We'll read the invitation email after login
      sessionStorage.setItem('pendingInvitation', JSON.stringify({ 
        companyId, 
        invitationId
      }));
      // Store the invitation URL for redirect after login
      sessionStorage.setItem('invitationRedirect', window.location.href);
      return;
    }

    try {
      // Get invitation to verify email matches - read directly from Firestore
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const invitationDocRef = doc(db, 'companies', companyId, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationDocRef);
      
      if (!invitationDoc.exists()) {
        setStatus('error');
        setMessage('Invitation not found or has been cancelled.');
        return;
      }
      
      const invitation = {
        id: invitationDoc.id,
        ...invitationDoc.data()
      };

      if (invitation.status !== 'pending') {
        setStatus('error');
        if (invitation.status === 'accepted') {
          setMessage('This invitation has already been accepted.');
        } else {
          setMessage('This invitation has expired or been cancelled.');
        }
        return;
      }

      // Verify email matches
      if (invitation.email.toLowerCase() !== currentUser.email?.toLowerCase()) {
        setStatus('emailMismatch');
        setMessage(`This invitation was sent to ${invitation.email}, but you're logged in as ${currentUser.email}.`);
        // Store invitation details for retry after login
        sessionStorage.setItem('pendingInvitation', JSON.stringify({ companyId, invitationId, invitationEmail: invitation.email }));
        return;
      }

      // Accept the invitation
      await acceptInvitation(companyId, invitationId, currentUser.uid, currentUser.email);

      // Get company name for the success message
      let fetchedCompanyName = 'the company';
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          fetchedCompanyName = companyDoc.data().name || 'the company';
          setCompanyName(fetchedCompanyName);
        }
      } catch (error) {
        console.warn('Could not fetch company name:', error);
      }

      // Mark onboarding as completed FIRST (before loading companies)
      // This ensures OnboardingContext knows to skip onboarding for invited users
      try {
        await completeOnboarding();
      } catch (error) {
        console.warn('Could not mark onboarding as complete:', error);
      }

      // Reload companies to ensure the new membership is reflected
      await loadUserCompanies();
      
      // Wait a moment for company context to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Switch to the company they just joined
      await switchCompany(companyId);
      
      // Wait another moment to ensure everything is loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      setStatus('success');
      setMessage(`Invitation accepted! You've been added to ${fetchedCompanyName}. Redirecting to dashboard...`);

      // Clear invitation flags immediately
      sessionStorage.removeItem('pendingInvitation');
      sessionStorage.removeItem('invitationRedirect');
      sessionStorage.removeItem('invitationFlow');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to accept invitation. Please try again.');
    }
  };

  if (status === 'needsLogin') {
    // Try to get invitation email from sessionStorage
    const pendingInvite = sessionStorage.getItem('pendingInvitation');
    const inviteEmail = pendingInvite ? JSON.parse(pendingInvite).invitationEmail : null;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <FaTimesCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Required</h2>
          <p className="text-gray-600 mb-2">{message}</p>
          {inviteEmail && (
            <p className="text-gray-500 text-sm mb-6">
              This invitation is for <strong>{inviteEmail}</strong>. You'll need to sign in or create an account with this email address.
            </p>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-semibold text-blue-900 mb-1">What happens next?</p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Sign in or create an account with <strong>{inviteEmail}</strong></li>
                  <li>You'll be automatically redirected back here</li>
                  <li>Your invitation will be accepted and you'll join the company</li>
                  <li>You'll be taken directly to the company dashboard (no company setup needed!)</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                // Pre-fill email if available
                const emailParam = inviteEmail ? `?email=${encodeURIComponent(inviteEmail)}` : '';
                navigate(`/login${emailParam}`);
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                // Pre-fill email if available
                const emailParam = inviteEmail ? `?email=${encodeURIComponent(inviteEmail)}` : '';
                navigate(`/signup${emailParam}`);
              }}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Create New Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <FaSpinner className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Processing Invitation...</h2>
            <p className="text-gray-600">Please wait while we verify your invitation.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invitation Accepted!</h2>
            <p className="text-gray-600 mb-2">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <strong>You're all set!</strong> You'll be redirected to {companyName || 'the company'} dashboard shortly. 
                You can start using Biz-CoPilot right away - no company setup needed.
              </p>
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </>
        )}

        {status === 'emailMismatch' && (
          <>
            <FaTimesCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Mismatch</h2>
            <p className="text-gray-600 mb-2">{message}</p>
            <p className="text-gray-500 text-sm mb-6">
              Please log out and sign in with the email address that received this invitation.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  // Store the invitation URL before logout
                  sessionStorage.setItem('invitationRedirect', window.location.href);
                  await logout();
                  navigate('/login');
                }}
                className="flex-1 px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
              >
                <FaSignOutAlt />
                Log Out & Sign In
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <FaTimesCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitation;

