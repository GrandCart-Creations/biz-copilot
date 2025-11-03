/**
 * ONBOARDING GATE
 * 
 * Checks if user needs onboarding and shows wizard if needed
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import OnboardingWizard from './OnboardingWizard';

const OnboardingGate = ({ children }) => {
  const location = useLocation();
  const { shouldShowOnboarding, loading } = useOnboarding();

  // CRITICAL: Never show onboarding on the accept-invitation route
  // Users accepting invitations should never see company creation onboarding
  if (location.pathname === '/accept-invitation') {
    return children;
  }

  // Also check for pending invitations in sessionStorage
  const pendingInvitation = sessionStorage.getItem('pendingInvitation');
  const invitationRedirect = sessionStorage.getItem('invitationRedirect');
  const invitationFlow = sessionStorage.getItem('invitationFlow');
  if (pendingInvitation || invitationRedirect || invitationFlow) {
    // User is in invitation flow - skip onboarding
    console.log('[OnboardingGate] Invitation flow detected - bypassing onboarding');
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (shouldShowOnboarding) {
    return <OnboardingWizard />;
  }

  return children;
};

export default OnboardingGate;

