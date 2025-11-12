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
import { acceptInvitation, getCompanyInvitations, getCompanyBranding, hasCompletedCompanyOnboarding } from '../firebase';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaSignOutAlt, FaInfoCircle } from 'react-icons/fa';
import TeamMemberWelcomeWizard from './Onboarding/TeamMemberWelcomeWizard';

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
  const [invitationEmail, setInvitationEmail] = useState('');
  const [invitationFullName, setInvitationFullName] = useState('');
  const [companyBranding, setCompanyBranding] = useState(null);
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);
  const [userRole, setUserRole] = useState(null);

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

    // If user is not logged in, fetch invitation and company details first (using public read access)
    if (!currentUser) {
      let fetchedInvitationEmail = null;
      let fetchedBranding = null;
      let fetchedCompanyName = 'the company';
      
      try {
        // Try to fetch invitation details (public read access for invitations)
        const invitationDocRef = doc(db, 'companies', companyId, 'invitations', invitationId);
        const invitationDoc = await getDoc(invitationDocRef);
        
        if (invitationDoc.exists()) {
          const invitation = invitationDoc.data();
          if (invitation.status === 'pending') {
            fetchedInvitationEmail = invitation.email;
            setInvitationEmail(invitation.email);
            setInvitationFullName(invitation.fullName || '');
            
            // Fetch company branding (public read access)
            try {
              const branding = await getCompanyBranding(companyId);
              fetchedBranding = branding;
              fetchedCompanyName = branding?.name || 'the company';
              setCompanyBranding(branding);
              setCompanyName(fetchedCompanyName);
            } catch (err) {
              console.warn('Could not load company branding:', err);
            }
          }
        }
      } catch (error) {
        console.warn('Could not fetch invitation details:', error);
      }
      
      setStatus('needsLogin');
      
      // CRITICAL: Ensure invitation flow flag is set BEFORE redirecting to login/signup
      // This prevents OnboardingContext from initializing onboarding during signup
      sessionStorage.setItem('invitationFlow', 'true');
      
      setMessage('Please log in or create an account to accept this invitation.');
      
      // Store invitation details from URL for redirect after login
      // Use the fetched email value directly (not state, which is async)
      const pendingInviteData = { 
        companyId, 
        invitationId,
        invitationEmail: fetchedInvitationEmail
      };
      sessionStorage.setItem('pendingInvitation', JSON.stringify(pendingInviteData));
      // Store the invitation URL for redirect after login
      sessionStorage.setItem('invitationRedirect', window.location.href);
      return;
    }

    try {
      // Get invitation to verify email matches - read directly from Firestore
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

      // Accept the invitation and get role
      await acceptInvitation(companyId, invitationId, currentUser.uid, currentUser.email);

      // Get role from the invitation we already fetched
      const assignedRole = invitation.role || 'employee';
      setUserRole(assignedRole);

      // Get company name for the success message
      let fetchedCompanyName = 'the company';
      try {
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          fetchedCompanyName = companyDoc.data().name || 'the company';
          setCompanyName(fetchedCompanyName);
        }
      } catch (error) {
        console.warn('Could not fetch company name:', error);
      }

      // Mark global onboarding as completed FIRST (before loading companies)
      // This ensures OnboardingContext knows to skip company creation onboarding for invited users
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

      // Check if user has completed company onboarding
      const hasCompleted = await hasCompletedCompanyOnboarding(companyId, currentUser.uid);
      
      if (!hasCompleted) {
        // Show welcome wizard
        setShowWelcomeWizard(true);
        setStatus('success');
      } else {
        // Already completed, go straight to dashboard
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
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to accept invitation. Please try again.');
    }
  };

  // Show welcome wizard if user just joined
  if (showWelcomeWizard && companyId && userRole) {
    return (
      <TeamMemberWelcomeWizard
        companyId={companyId}
        userRole={userRole}
        onComplete={() => {
          // Clear invitation flags
          sessionStorage.removeItem('pendingInvitation');
          sessionStorage.removeItem('invitationRedirect');
          sessionStorage.removeItem('invitationFlow');
          // Navigate to dashboard
          navigate('/dashboard');
        }}
      />
    );
  }

  if (status === 'needsLogin') {
    const inviteEmail = invitationEmail || (sessionStorage.getItem('pendingInvitation') ? JSON.parse(sessionStorage.getItem('pendingInvitation')).invitationEmail : null);
    
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 px-4 py-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          {/* Company Logo/Name if available */}
          <div className="mb-4">
            <img
              src={companyBranding?.branding?.logoUrl || '/branding/logo/logo-icon.svg'}
              alt={companyBranding?.name || 'Biz-CoPilot'}
              className="w-14 h-auto mx-auto mb-2 object-contain"
            />
            <h3 className="text-lg font-bold text-gray-900 mb-1">{companyBranding?.name || 'Biz-CoPilot'}</h3>
            <p className="text-xs text-gray-600 mb-2">
              {companyBranding?.branding?.tagline || 'Your Business Co-Pilot, Every Step of the Way'}
            </p>
            {companyBranding?.branding?.aboutCompany && (
              <p className="text-xs text-gray-500 leading-relaxed">{companyBranding.branding.aboutCompany}</p>
            )}
          </div>
          
          <FaInfoCircle className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {companyName ? `Join ${companyName}` : 'Join the Team'}
          </h2>
          <p className="text-sm text-gray-600 mb-3">{message}</p>
          
          {inviteEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                📧 This invitation was sent to:
              </p>
              <p className="text-sm font-bold text-blue-700 mb-2">
                {invitationFullName ? `${invitationFullName} at ` : ''}{inviteEmail}
              </p>
              <p className="text-xs text-blue-800">
                You must use <strong>this exact email address</strong> to sign in or create your account.
              </p>
            </div>
          )}
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-left">
            <div className="flex items-start gap-2">
              <FaInfoCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-900 mb-1.5">What happens next?</p>
                <ol className="text-xs text-green-800 space-y-1 list-decimal list-inside">
                  <li>Sign in or create an account using <strong>{inviteEmail || 'the invited email address'}</strong></li>
                  <li>If you're new to Biz-CoPilot, you'll create a password (no temporary password needed)</li>
                  <li>You'll be automatically redirected back here</li>
                  <li>Your invitation will be accepted and you'll join {companyName || 'the company'}</li>
                  <li>You'll be taken directly to the company dashboard (no company setup needed!)</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                // Include company ID for branded login page
                const params = new URLSearchParams();
                if (companyId) params.set('company', companyId);
                if (inviteEmail) params.set('email', inviteEmail);
                navigate(`/login?${params.toString()}`);
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg font-semibold hover:from-[#014A5A] hover:to-[#019884] transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                // Include company ID for branded signup page
                const params = new URLSearchParams();
                if (companyId) params.set('company', companyId);
                if (inviteEmail) params.set('email', inviteEmail);
                navigate(`/signup?${params.toString()}`);
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

