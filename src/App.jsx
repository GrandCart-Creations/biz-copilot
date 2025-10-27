// src/App.jsx
// Main Application Component with Routing and Authentication

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SecurityProvider } from './contexts/SecurityContext';
import Signup from './components/Auth/Signup';
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ExpenseTracker from './components/ExpenseTracker';
import SecurityDashboard from './components/SecurityDashboard';
import MFASetup from './components/MFASetup';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SecurityProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
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
        </SecurityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
