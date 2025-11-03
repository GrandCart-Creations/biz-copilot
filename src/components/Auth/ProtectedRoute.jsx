// src/components/Auth/ProtectedRoute.jsx
// Protected Route Component - Requires authentication to access

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import OnboardingGate from '../Onboarding/OnboardingGate';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

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

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Wrap children with OnboardingGate to check if onboarding is needed
  return <OnboardingGate>{children}</OnboardingGate>;
};

export default ProtectedRoute;
