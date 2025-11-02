// src/App.jsx
// Main Application Component with Routing and Authentication

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { CompanyProvider } from './contexts/CompanyContext';
import Signup from './components/Auth/Signup';
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ExpenseTracker from './components/ExpenseTracker';
import SecurityDashboard from './components/SecurityDashboard';
import MFASetup from './components/MFASetup';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import CookiePolicy from './components/CookiePolicy';
import CookieConsent from './components/CookieConsent';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SecurityProvider>
          <CompanyProvider>
            {/* Cookie Consent Banner - appears on all pages */}
            <CookieConsent />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Legal Pages (Public) */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            
            {/* Protected Route - Expense Tracker Dashboard */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <ExpenseTracker />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Security Dashboard */}
            <Route 
              path="/security/dashboard" 
              element={
                <ProtectedRoute>
                  <SecurityDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - MFA Setup */}
            <Route 
              path="/settings/mfa" 
              element={
                <ProtectedRoute>
                  <MFASetup />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </CompanyProvider>
        </SecurityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
