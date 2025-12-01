/**
 * ONBOARDING CONTEXT
 * 
 * Manages onboarding state, progress, and completion for new users
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { currentCompany, companies, userRole } = useCompany();
  const [onboardingData, setOnboardingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  const loadOnboardingStatus = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // CRITICAL: Check if user has a pending invitation BEFORE checking onboarding
      // If they do, don't initialize onboarding - wait for invitation acceptance
      const pendingInvitation = sessionStorage.getItem('pendingInvitation');
      const invitationRedirect = sessionStorage.getItem('invitationRedirect');
      const invitationFlow = sessionStorage.getItem('invitationFlow');
      
      if (pendingInvitation || invitationRedirect || invitationFlow) {
        // User is in the invitation flow - DO NOT initialize onboarding
        // Wait for them to accept the invitation first
        console.log('[OnboardingContext] Invitation flow detected - skipping onboarding initialization');
        setShouldShowOnboarding(false);
        setLoading(false);
        return;
      }
      
      // Check onboarding document
      const onboardingRef = doc(db, 'users', currentUser.uid, 'onboarding', 'status');
      const onboardingDoc = await getDoc(onboardingRef);

      if (onboardingDoc.exists()) {
        const data = onboardingDoc.data();
        setOnboardingData(data);
        
        // If onboarding is already completed or skipped, don't show it
        if (data.completed || data.skipped) {
          setShouldShowOnboarding(false);
          return;
        }
        
        // CRITICAL FIX: If onboarding was STARTED but not completed, ALWAYS show it
        // This ensures new users complete the full onboarding flow
        // Even if they created a company via CompanySelector first
        if (data.started && !data.completed && !data.skipped) {
          console.log('[OnboardingContext] Onboarding was started but not completed - showing wizard');
          setShouldShowOnboarding(true);
          return;
        }
        
        // Onboarding exists but wasn't started - initialize and show it
        setShouldShowOnboarding(true);
        if (!data.started) {
          await initializeOnboarding();
        }
      } else {
        // No onboarding data - this is a new user
        // ALWAYS show onboarding for new users, even if they have a company
        // (They might have created it via CompanySelector before onboarding initialized)
        console.log('[OnboardingContext] No onboarding data - initializing for new user');
        await initializeOnboarding();
        setShouldShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error loading onboarding status:', error);
      setShouldShowOnboarding(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser, companies]);

  // Load onboarding status when user or companies change
  useEffect(() => {
    if (currentUser && companies !== undefined) {
      loadOnboardingStatus();
    } else if (!currentUser) {
      setLoading(false);
      setShouldShowOnboarding(false);
    }
  }, [currentUser, companies, loadOnboardingStatus]);

  const initializeOnboarding = async () => {
    if (!currentUser) return;

    try {
      const onboardingRef = doc(db, 'users', currentUser.uid, 'onboarding', 'status');
      await setDoc(onboardingRef, {
        started: true,
        startedAt: serverTimestamp(),
        step: 0,
        completed: false,
        completedAt: null,
        skipped: false,
        role: userRole || 'owner' // Default to owner for first-time users
      });

      setOnboardingData({
        started: true,
        startedAt: new Date(),
        step: 0,
        completed: false,
        skipped: false,
        role: userRole || 'owner'
      });
    } catch (error) {
      console.error('Error initializing onboarding:', error);
    }
  };

  const updateOnboardingStep = async (step, data = {}) => {
    if (!currentUser) return;

    try {
      const onboardingRef = doc(db, 'users', currentUser.uid, 'onboarding', 'status');
      await setDoc(onboardingRef, {
        ...onboardingData,
        step,
        lastUpdated: serverTimestamp(),
        ...data
      }, { merge: true });

      setOnboardingData(prev => ({
        ...prev,
        step,
        ...data
      }));
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  };

  const completeOnboarding = async () => {
    if (!currentUser) return;

    try {
      const onboardingRef = doc(db, 'users', currentUser.uid, 'onboarding', 'status');
      
      // Get existing data or use current state
      const existingDoc = await getDoc(onboardingRef);
      const existingData = existingDoc.exists() ? existingDoc.data() : (onboardingData || {});
      
      await setDoc(onboardingRef, {
        ...existingData,
        completed: true,
        completedAt: serverTimestamp(),
        step: 999, // Final step
        joinedViaInvitation: true // Mark as invited user
      }, { merge: true });

      setOnboardingData({
        ...existingData,
        completed: true,
        completedAt: new Date(),
        step: 999,
        joinedViaInvitation: true
      });

      setShouldShowOnboarding(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const skipOnboarding = async () => {
    if (!currentUser) return;

    try {
      const onboardingRef = doc(db, 'users', currentUser.uid, 'onboarding', 'status');
      await setDoc(onboardingRef, {
        ...onboardingData,
        skipped: true,
        skippedAt: serverTimestamp(),
        completed: false
      }, { merge: true });

      setOnboardingData(prev => ({
        ...prev,
        skipped: true,
        skippedAt: new Date()
      }));

      setShouldShowOnboarding(false);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const value = {
    onboardingData,
    loading,
    shouldShowOnboarding,
    updateOnboardingStep,
    completeOnboarding,
    skipOnboarding,
    refreshOnboarding: loadOnboardingStatus
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;

