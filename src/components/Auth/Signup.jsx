// src/components/Auth/Signup.jsx - ENHANCED VERSION
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signUpWithEmail, signInWithGoogle, getCompanyBranding } from '../../firebase';
import Footer from '../Footer';
import { FaChartLine, FaReceipt, FaShieldAlt, FaClock, FaFileInvoice, FaCalculator, FaSyncAlt, FaUsers, FaCheckCircle } from 'react-icons/fa';

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check for email in URL params (from invitation flow)
  const emailFromUrl = searchParams.get('email');
  const companyIdFromUrl = searchParams.get('company');
  const pendingInvite = sessionStorage.getItem('pendingInvitation');
  const inviteData = pendingInvite ? JSON.parse(pendingInvite) : null;
  
  // Company branding state
  const [companyBranding, setCompanyBranding] = useState(null);
  const [loadingBranding, setLoadingBranding] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: emailFromUrl || inviteData?.invitationEmail || '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);

  // Load company branding if company ID is in URL
  useEffect(() => {
    const loadBranding = async () => {
      // Get company ID from URL params or pending invitation
      const companyId = companyIdFromUrl || (inviteData && inviteData.companyId ? inviteData.companyId : null);
      if (companyId) {
        setLoadingBranding(true);
        try {
          const branding = await getCompanyBranding(companyId);
          setCompanyBranding(branding);
        } catch (err) {
          console.warn('Could not load company branding:', err);
          // Fallback to default branding
          setCompanyBranding(null);
        } finally {
          setLoadingBranding(false);
        }
      }
    };
    
    loadBranding();
  }, [companyIdFromUrl, inviteData]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    if (!hasUpperCase || !hasNumber) {
      setError('Password should contain at least one uppercase letter and one number');
      return;
    }

    setLoading(true);

    try {
      const result = await signUpWithEmail(
        formData.email, 
        formData.password, 
        formData.name
      );
      setSuccess(result.message);
      setShowVerificationNotice(true);
      
      // Check if there's a pending invitation to accept
      const invitationRedirect = sessionStorage.getItem('invitationRedirect');
      if (invitationRedirect) {
        // Redirect to invitation acceptance after signup (shorter delay for better UX)
        // The invitationRedirect URL includes the company parameter for branded pages
        setTimeout(() => {
          window.location.href = invitationRedirect;
        }, 2000);
      } else {
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signInWithGoogle();
      setSuccess('Successfully signed in! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    
    if (strength <= 2) return { strength, text: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, text: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, text: 'Good', color: 'bg-blue-500' };
    return { strength, text: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  const benefits = [
    {
      icon: <FaReceipt className="w-5 h-5" />,
      title: "Instant Expense Capture",
      description: "Scan receipts and auto-categorize expenses in seconds"
    },
    {
      icon: <FaCalculator className="w-5 h-5" />,
      title: "BENELUX Tax Compliance Made Easy",
      description: "Built-in Benelux tax rates with automatic calculations"
    },
    {
      icon: <FaFileInvoice className="w-5 h-5" />,
      title: "Invoice Management",
      description: "Create, send, and track invoices from one platform"
    },
    {
      icon: <FaChartLine className="w-5 h-5" />,
      title: "Real-time Insights",
      description: "Live dashboards showing your business financial health"
    },
    {
      icon: <FaShieldAlt className="w-5 h-5" />,
      title: "Bank-Level Security",
      description: "MFA, encryption, and GDPR compliance built-in"
    },
    {
      icon: <FaUsers className="w-5 h-5" />,
      title: "Team Collaboration",
      description: "Share access with your accountant or team members"
    }
  ];

  return (
    <div className="h-screen w-full bg-gray-50 overflow-hidden flex flex-col">
      <div className="flex-1 w-full flex overflow-hidden">
        {/* Left Side - Branding & Value Proposition (40% width) */}
        <div className="hidden lg:flex lg:w-2/5 lg:flex-shrink-0 lg:flex-grow-0 bg-gradient-to-br from-[#005C70] via-[#2F6F63] to-[#00BFA6] p-3 flex-col justify-between relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={companyBranding?.branding?.logoUrl || '/branding/logo/logo-icon.svg'}
                  alt={companyBranding?.name || 'Biz-CoPilot'}
                  className="h-12 w-auto object-contain bg-white/10 rounded-lg p-1.5 backdrop-blur-sm"
                />
                <h1 className="text-2xl font-bold text-white">
                  {companyBranding?.name || 'Biz-CoPilot'}
                </h1>
              </div>
              
              <div className="space-y-1 mb-2">
                <h2 className="text-xl font-semibold text-white leading-tight">
                  {companyBranding?.branding?.tagline || 'Start Your Business Journey with Your Co-Pilot'}
                </h2>
                <p className="text-xs text-indigo-100 leading-tight">
                  {companyBranding?.branding?.aboutCompany 
                    ? companyBranding.branding.aboutCompany
                    : companyBranding?.branding?.tagline 
                    ? 'Join BENELUX entrepreneurs managing their business with intelligent automation.'
                    : 'Join BENELUX entrepreneurs managing their business with intelligent automation and enterprise-grade security.'
                  }
                </p>
              </div>

              {/* Benefits Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {benefits.map((benefit, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/20">
                    <div className="text-white mb-0.5 text-xs">
                      {benefit.icon}
                    </div>
                    <h3 className="text-white text-xs font-semibold mb-0.5 leading-tight">{benefit.title}</h3>
                    <p className="text-indigo-200 text-xs leading-tight">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Stats */}
            <div className="relative z-10 mt-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 border border-white/20">
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-center">
                    <p className="text-white text-lg font-bold">100%</p>
                    <p className="text-indigo-200 text-xs">GDPR Compliant</p>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="flex-1 text-center">
                    <p className="text-white text-lg font-bold">24/7</p>
                    <p className="text-indigo-200 text-xs">Secure & Available</p>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="flex-1 text-center">
                    <p className="text-white text-lg font-bold">Free</p>
                    <p className="text-indigo-200 text-xs">To Get Started</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form (60% width) */}
        <div className="flex-1 lg:flex-none lg:w-3/5 lg:flex-shrink-0 lg:flex-grow-0 flex flex-col items-center justify-center p-3 bg-white overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Logo for mobile */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
              <img
                src={companyBranding?.branding?.logoUrl || '/branding/logo/logo-icon.svg'}
                alt={companyBranding?.name || 'Biz-CoPilot'}
                className="h-12 w-auto object-contain"
              />
              <h1 className="text-2xl font-bold text-gray-900">
                {companyBranding?.name || 'Biz-CoPilot'}
              </h1>
            </div>

            {/* Welcome Card */}
            <div className="mb-2">
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">Create Your Account</h2>
              <p className="text-xs text-gray-600">
                {pendingInvite ? 'Join the team and start collaborating' : 'Start managing your business finances today'}
              </p>
              {pendingInvite && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-900 mb-1">🎉 You're joining a team!</p>
                  {inviteData?.invitationEmail && (
                    <p className="text-xs text-blue-800 mb-2">
                      Use <strong>{inviteData.invitationEmail}</strong> as your email address.
                    </p>
                  )}
                  <p className="text-xs text-blue-700 mb-1">
                    Create a secure password for your account. You'll use this to sign in going forward.
                  </p>
                  <p className="text-xs text-blue-700">
                    After creating your account, you'll automatically join the company.
                    <strong className="block mt-1">No company setup needed - you're joining an existing team!</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <FaCheckCircle className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-green-800 mb-0.5">{success}</p>
                    {showVerificationNotice && (
                      <p className="text-xs text-green-700">
                        Please check your email to verify your account. Redirecting to dashboard...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <svg className="w-3 h-3 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-2 mb-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-600">Password strength:</span>
                      <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-white text-sm font-semibold rounded-lg focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: companyBranding?.branding?.primaryColor 
                    ? `linear-gradient(to right, ${companyBranding.branding.primaryColor}, ${companyBranding.branding.primaryColor}dd)`
                    : 'linear-gradient(to right, #005C70, #00BFA6)',
                }}
                onMouseEnter={(e) => {
                  if (companyBranding?.branding?.primaryColor) {
                    e.target.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (companyBranding?.branding?.primaryColor) {
                    e.target.style.opacity = '1';
                  }
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-2">
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
              disabled={loading}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Signing in...' : 'Google'}
            </button>

            {/* Sign In Link */}
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer with Legal Links */}
      <Footer />
    </div>
  );
}
