// src/App.jsx
// Main Application Component with Routing and Authentication

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Signup from './components/Auth/Signup';
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ExpenseTracker from './components/ExpenseTracker';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route - Login */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Route - Expense Tracker Dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <ExpenseTracker />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
