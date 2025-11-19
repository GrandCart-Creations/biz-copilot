// src/App.jsx
// Main Application Component with Routing and Authentication

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import Signup from './components/Auth/Signup';
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
// Lazy load heavy components for better performance
import { lazy, Suspense } from 'react';
const ExpenseTracker = lazy(() => import('./components/ExpenseTracker'));
const IncomeTracker = lazy(() => import('./components/IncomeTracker'));
const InvoiceTracker = lazy(() => import('./components/InvoiceTracker'));
const MarketingTracker = lazy(() => import('./components/MarketingTracker'));
const ProjectsTracker = lazy(() => import('./components/ProjectsTracker'));
const ForecastingTracker = lazy(() => import('./components/ForecastingTracker'));
const FinancialDashboard = lazy(() => import('./components/FinancialDashboard'));
const ReportsDashboard = lazy(() => import('./components/ReportsDashboard'));
const SettingsDashboard = lazy(() => import('./components/SettingsDashboard'));
const TeamTracker = lazy(() => import('./components/TeamTracker'));
const SecurityDashboard = lazy(() => import('./components/SecurityDashboard'));
const MFASetup = lazy(() => import('./components/MFASetup'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const OwnerActivityLog = lazy(() => import('./components/OwnerActivityLog'));
import ModuleDashboard from './components/ModuleDashboard';
import SubscriptionGateWrapper from './components/SubscriptionGateWrapper';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import CookiePolicy from './components/CookiePolicy';
import CookieConsent from './components/CookieConsent';
import AcceptInvitation from './components/AcceptInvitation';
import EmailVerificationError from './components/EmailVerificationError';
import AICommandCenter from './components/AICommandCenter';
import MainLayout from './components/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SecurityProvider>
          <CompanyProvider>
            <OnboardingProvider>
              {/* Cookie Consent Banner - appears on all pages */}
              <CookieConsent />
              <AICommandCenter />
          
          <MainLayout>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Legal Pages (Public) */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            
            {/* Invitation Acceptance (Public - users need to see it before logging in) */}
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            
            {/* Email Verification Error Handler (Public - handles verification link errors) */}
            <Route path="/auth/action" element={<EmailVerificationError />} />
            <Route path="/email-verification" element={<EmailVerificationError />} />
            
            {/* Protected Route - Main Dashboard (Module Selection) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <ModuleDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Owner Activity Log */}
            <Route
              path="/owner/activity"
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading owner timeline...</p>
                      </div>
                    </div>
                  }>
                    <OwnerActivityLog />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            
            {/* Protected Route - Expenses Module */}
            <Route 
              path="/modules/expenses" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Expenses...</p>
                      </div>
                    </div>
                  }>
                    <ExpenseTracker />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Income Module */}
            <Route 
              path="/modules/income" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Income...</p>
                      </div>
                    </div>
                  }>
                    <IncomeTracker />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Invoices Module (Accounts Receivable) */}
            <Route 
              path="/modules/invoices" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Invoices...</p>
                      </div>
                    </div>
                  }>
                    <InvoiceTracker />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Marketing Module */}
            <Route 
              path="/modules/marketing" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Marketing...</p>
                      </div>
                    </div>
                  }>
                    <MarketingTracker />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Projects Module */}
            <Route 
              path="/modules/projects" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Projects...</p>
                      </div>
                    </div>
                  }>
                    <ProjectsTracker />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Forecasting Module */}
            <Route 
              path="/modules/forecasting" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Forecasting...</p>
                      </div>
                    </div>
                  }>
                    <ForecastingTracker />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Financial Dashboard */}
            <Route 
              path="/modules/financial-dashboard" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Dashboard...</p>
                      </div>
                    </div>
                  }>
                    <FinancialDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Reports Module */}
            <Route 
              path="/modules/reports" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Reports...</p>
                      </div>
                    </div>
                  }>
                    <ReportsDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Settings Module */}
            <Route 
              path="/modules/settings" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Settings...</p>
                      </div>
                    </div>
                  }>
                    <SettingsDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Team Module */}
            <Route 
              path="/modules/team" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Team Management...</p>
                      </div>
                    </div>
                  }>
                    <TeamTracker />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - User Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Profile...</p>
                      </div>
                    </div>
                  }>
                    <ProfilePage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            
            {/* Protected Route - Subscription Gate (Upgrade Required) */}
            <Route 
              path="/modules/:moduleId/upgrade" 
              element={
                <ProtectedRoute>
                  <SubscriptionGateWrapper />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - Security Dashboard */}
            <Route 
              path="/security/dashboard" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Security...</p>
                      </div>
                    </div>
                  }>
                    <SecurityDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Route - MFA Setup */}
            <Route 
              path="/settings/mfa" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading MFA Setup...</p>
                      </div>
                    </div>
                  }>
                    <MFASetup />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </MainLayout>
            </OnboardingProvider>
          </CompanyProvider>
        </SecurityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
