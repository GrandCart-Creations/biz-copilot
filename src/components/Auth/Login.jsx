// src/components/Auth/Login.jsx - ENHANCED VERSION WITH SECURITY
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail, signInWithGoogle, resetPassword } from '../../firebase';
import { useSecurityContext } from '../../contexts/SecurityContext';
import { validateEmail } from '../../utils/validation';
import { logLogin, logAuditEvent, AUDIT_EVENTS } from '../../utils/auditLog';
import Footer from '../Footer';
import { FaChartLine, FaReceipt, FaShieldAlt, FaClock, FaFileInvoice, FaCalculator, FaSyncAlt, FaLock } from 'react-icons/fa';

export default function Login() {
  const navigate = useNavigate();
  const { handleFailedLogin, handleSuccessfulLogin, isAccountLocked } = useSecurityContext();
  
  // Check for email in URL params (from invitation flow)
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');
  const [email, setEmail] = useState(emailFromUrl || '');
  const [password, setPassword] = useState('');
  
  // Check if there's a pending invitation
  const pendingInvite = sessionStorage.getItem('pendingInvitation');
  const hasPendingInvitation = !!pendingInvite;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Check if account is locked
    if (isAccountLocked) {
      setError('Account temporarily locked due to failed login attempts. Please try again in 15 minutes.');
      return;
    }
    
    setLoading(true);

    try {
      // Validate email format
      const validEmail = validateEmail(email);
      
      // Attempt sign in
      await signInWithEmail(validEmail, password);
      
      // Log successful login
      await logLogin(validEmail, true);
      handleSuccessfulLogin();
      
      setSuccess('Successfully signed in! Redirecting...');
      
      // Check if there's a pending invitation to accept
      const invitationRedirect = sessionStorage.getItem('invitationRedirect');
      if (invitationRedirect) {
        setTimeout(() => window.location.href = invitationRedirect, 1000);
      } else {
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (err) {
      // Log failed login
      await logLogin(email, false);
      handleFailedLogin(email);
      
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    
    // Check if account is locked
    if (isAccountLocked) {
      setError('Account temporarily locked due to failed login attempts. Please try again in 15 minutes.');
      return;
    }
    
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      
      // Log successful login
      await logAuditEvent(AUDIT_EVENTS.USER_LOGIN, {
        email: result.user?.email,
        method: 'google'
      }, 'success');
      handleSuccessfulLogin();
      
      setSuccess('Successfully signed in! Redirecting...');
      
      // Check if there's a pending invitation to accept
      const invitationRedirect = sessionStorage.getItem('invitationRedirect');
      if (invitationRedirect) {
        setTimeout(() => window.location.href = invitationRedirect, 1000);
      } else {
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (err) {
      // Log failed login
      await logAuditEvent(AUDIT_EVENTS.FAILED_LOGIN, {
        method: 'google',
        error: err.message
      }, 'failure');
      
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    
    if (!resetEmail) {
      setResetError('Please enter your email address');
      return;
    }
    
    setResetLoading(true);

    try {
      // Validate email format
      const validEmail = validateEmail(resetEmail);
      
      const message = await resetPassword(validEmail);
      
      // Log password reset request
      await logAuditEvent(AUDIT_EVENTS.PASSWORD_RESET, {
        email: validEmail
      }, 'success');
      
      setResetSuccess(message);
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetSuccess('');
      }, 3000);
    } catch (err) {
      setResetError(err.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const painPoints = [
    {
      icon: <FaReceipt className="w-6 h-6" />,
      problem: "Lost receipts, manual entry, tax season stress",
      solution: "Automatic expense capture with receipt scanning"
    },
    {
      icon: <FaCalculator className="w-6 h-6" />,
      problem: "Complex tax calculations and compliance worries across BENELUX",
      solution: "Built-in Benelux tax rates (0%, 9%, 21%) with auto-calculations"
    },
    {
      icon: <FaFileInvoice className="w-6 h-6" />,
      problem: "Scattered invoices, missed payments, cash flow gaps",
      solution: "Centralized invoice management with payment tracking"
    },
    {
      icon: <FaChartLine className="w-6 h-6" />,
      problem: "No real-time visibility into business finances",
      solution: "Live dashboards and insights for better decisions"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gray-50 overflow-hidden">
      <div className="min-h-screen w-full flex overflow-hidden">
        {/* Left Side - Branding & Value Proposition (40% width) */}
        <div className="hidden lg:flex lg:w-2/5 lg:flex-shrink-0 lg:flex-grow-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 flex-col justify-start relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <span className="text-lg font-bold text-white">BC</span>
              </div>
              <h1 className="text-lg font-bold text-white">Biz-CoPilot</h1>
            </div>
            
            <div className="space-y-2 mb-3">
              <h2 className="text-2xl font-bold text-white leading-tight">
                Your Business Co-Pilot, Every Step of the Way
              </h2>
              <p className="text-sm text-indigo-100 leading-tight">
                Intelligent business management for BENELUX entrepreneurs. Track expenses, manage invoices, and stay compliant with GDPR - all in one secure platform.
              </p>
            </div>

            {/* Pain Points & Solutions */}
            <div className="space-y-2 mb-2">
              <h3 className="text-sm font-semibold text-white mb-2">Solve Your Daily Challenges</h3>
              {painPoints.map((point, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs">
                      {point.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-white/90 text-xs font-medium mb-0.5 leading-tight">{point.solution}</p>
                      <p className="text-indigo-200 text-xs leading-tight">{point.problem}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Features */}
          <div className="relative z-10 mt-auto pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                <FaShieldAlt className="w-3 h-3 text-white mb-1" />
                <p className="text-white text-xs font-medium">Enterprise Security</p>
                <p className="text-indigo-200 text-xs">MFA & Encryption</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                <FaSyncAlt className="w-3 h-3 text-white mb-1" />
                <p className="text-white text-xs font-medium">Real-time Sync</p>
                <p className="text-indigo-200 text-xs">Access Anywhere</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form (60% width) */}
        <div className="flex-1 lg:flex-none lg:w-3/5 lg:flex-shrink-0 lg:flex-grow-0 flex flex-col items-center justify-center p-4 bg-white overflow-hidden">
          <div className="w-full max-w-md">
            {/* Logo for mobile */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-white">BC</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900">Biz-CoPilot</h1>
            </div>

            {/* Welcome Card */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">Welcome Back</h2>
              <p className="text-xs text-gray-600">Sign in to your account</p>
              {hasPendingInvitation && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    You have a pending invitation. Sign in to accept it.
                  </p>
                </div>
              )}
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-green-700">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <svg className="w-3 h-3 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-2 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading || isAccountLocked}
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    disabled={loading}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading || isAccountLocked}
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading || isAccountLocked}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading || isAccountLocked}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Signing in...' : 'Google'}
            </button>

            {/* Sign Up Link */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowResetModal(false);
                setResetEmail('');
                setResetError('');
                setResetSuccess('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h3>
              <p className="text-gray-600 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Success Message */}
            {resetSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-700">{resetSuccess}</p>
              </div>
            )}

            {/* Error Message */}
            {resetError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600">{resetError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={resetLoading}
                  className="w-full px-4 py-3 text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Footer with Legal Links */}
      <Footer />
    </div>
  );
}
