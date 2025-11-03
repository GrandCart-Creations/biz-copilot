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
        
        // Determine if onboarding should be shown
        // Show if: not completed AND (no companies OR first-time user creating a company)
        const hasNoCompanies = !companies || companies.length === 0;
        const isFirstTime = !data.completed && (hasNoCompanies || data.step < 2);
        
        // IMPORTANT: If user has companies but onboarding not completed, 
        // they likely joined via invitation - skip onboarding
        if (!hasNoCompanies && !data.completed) {
          // User has companies but onboarding isn't complete - they joined via invitation
          // Mark onboarding as completed to prevent showing it
          try {
            await completeOnboarding();
          } catch (error) {
            console.error('Error auto-completing onboarding for invited user:', error);
          }
          setShouldShowOnboarding(false);
        } else {
          setShouldShowOnboarding(isFirstTime);
        }
      } else {
        // No onboarding data - check if user needs onboarding
        const hasNoCompanies = !companies || companies.length === 0;
        const needsOnboarding = hasNoCompanies;
        
        // If user has companies but no onboarding data, they joined via invitation
        // Skip onboarding entirely
        if (!hasNoCompanies) {
          setShouldShowOnboarding(false);
          // Initialize onboarding as completed
          await initializeOnboarding();
          await completeOnboarding();
        } else {
          setShouldShowOnboarding(needsOnboarding);
          // Initialize onboarding document for company creators
          if (needsOnboarding) {
            await initializeOnboarding();
          }
        }
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

