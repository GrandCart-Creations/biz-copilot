/**
 * TEAM MEMBER WELCOME WIZARD
 * 
 * Welcome wizard for new team members who join via invitation
 * Shows role-specific orientation and company information
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { getCompanyOnboarding, completeCompanyOnboarding, getCompanyMembers, storeLegalAcceptance, sendEmailVerificationToUser } from '../../firebase';
import { 
  FaCheckCircle, 
  FaArrowRight, 
  FaUsers, 
  FaClock, 
  FaTasks, 
  FaShieldAlt,
  FaChartLine,
  FaFileInvoice,
  FaCog,
  FaRocket,
  FaUserTie,
  FaUserShield,
  FaFileContract,
  FaLock,
  FaEnvelope,
  FaExclamationTriangle,
  FaBullhorn
} from 'react-icons/fa';

const TeamMemberWelcomeWizard = ({ companyId, userRole, onComplete }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, userRole: currentUserRole } = useCompany();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [emailVerified, setEmailVerified] = useState(currentUser?.emailVerified || false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  useEffect(() => {
    loadOnboardingData();
    // Check email verification status
    if (currentUser) {
      setEmailVerified(currentUser.emailVerified || false);
    }
  }, [companyId, currentUser]);

  const loadOnboardingData = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Load company onboarding settings
      const onboarding = await getCompanyOnboarding(companyId);
      setOnboardingData(onboarding);
      
      // Load team members for chain of command
      const members = await getCompanyMembers(companyId);
      setTeamMembers(members);
    } catch (error) {
      console.warn('Could not load onboarding data:', error);
      setOnboardingData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!currentUser) return;
    
    setVerifyingEmail(true);
    try {
      await sendEmailVerificationToUser(currentUser);
      setEmailVerificationSent(true);
    } catch (error) {
      console.error('Error sending verification email:', error);
      alert(error.message || 'Failed to send verification email. Please try again.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const checkEmailVerification = async () => {
    if (!currentUser) return;
    
    // Reload user to get latest verification status
    await currentUser.reload();
    const verified = currentUser.emailVerified || false;
    setEmailVerified(verified);
    
    if (verified) {
      setEmailVerificationSent(false); // Reset sent flag if verified
    }
  };

  const handleComplete = async () => {
    try {
      if (currentUser?.uid && companyId) {
        // Store legal acceptance
        await storeLegalAcceptance(companyId, currentUser.uid, {
          termsAccepted,
          privacyAccepted
        });
        
        // Complete onboarding
        await completeCompanyOnboarding(companyId, currentUser.uid);
      }
      if (onComplete) {
        onComplete();
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Continue anyway
      if (onComplete) {
        onComplete();
      } else {
        navigate('/dashboard');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0FBF8] to-[#EAF4F6]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6]"></div>
          <p className="mt-4 text-gray-600">Loading welcome...</p>
        </div>
      </div>
    );
  }

  const role = userRole || currentUserRole || 'employee';
  const companyName = currentCompany?.name || onboardingData?.companyName || 'the company';

  // Role-specific access information
  const roleAccess = {
    owner: {
      title: 'Owner',
      icon: <FaUserShield className="w-8 h-8" />,
      color: 'from-[#005C70] to-[#00BFA6]',
      access: [
        { module: 'Expenses', icon: <FaChartLine />, description: 'Full access to all expenses' },
        { module: 'Income', icon: <FaChartLine />, description: 'Full access to all income tracking' },
        { module: 'Financial Dashboard', icon: <FaChartLine />, description: 'Complete financial overview' },
        { module: 'Reports', icon: <FaFileInvoice />, description: 'Generate and export reports' },
        { module: 'Settings', icon: <FaCog />, description: 'Company and team management' },
        { module: 'Team Management', icon: <FaUsers />, description: 'Invite and manage team members' }
      ]
    },
    manager: {
      title: 'Manager',
      icon: <FaUserTie className="w-8 h-8" />,
      color: 'from-[#2F6F63] to-[#00BFA6]',
      access: [
        { module: 'Expenses', icon: <FaChartLine />, description: 'View and manage team expenses' },
        { module: 'Income', icon: <FaChartLine />, description: 'Track revenue and income' },
        { module: 'Financial Dashboard', icon: <FaChartLine />, description: 'Financial overview and insights' },
        { module: 'Reports', icon: <FaFileInvoice />, description: 'Generate reports and analytics' },
        { module: 'Team Management', icon: <FaUsers />, description: 'Invite team members' }
      ]
    },
    accountant: {
      title: 'Accountant',
      icon: <FaFileInvoice className="w-8 h-8" />,
      color: 'from-[#00BFA6] to-[#F4B400]',
      access: [
        { module: 'Expenses', icon: <FaChartLine />, description: 'View and categorize expenses' },
        { module: 'Income', icon: <FaChartLine />, description: 'Track and verify income' },
        { module: 'Reports', icon: <FaFileInvoice />, description: 'Generate financial reports' }
      ]
    },
    marketingManager: {
      title: 'Marketing Manager',
      icon: <FaBullhorn className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
      access: [
        { module: 'Marketing', icon: <FaBullhorn />, description: 'Full control of campaigns, social media, and tasks' },
        { module: 'Expenses', icon: <FaChartLine />, description: 'View budget and spending' },
        { module: 'Income', icon: <FaChartLine />, description: 'Track revenue impact' },
        { module: 'Reports', icon: <FaFileInvoice />, description: 'Measure marketing effectiveness' }
      ]
    },
    employee: {
      title: 'Employee',
      icon: <FaUsers className="w-8 h-8" />,
      color: 'from-gray-600 to-slate-600',
      access: [
        { module: 'Expenses', icon: <FaChartLine />, description: 'Submit and track your expenses' }
      ]
    }
  };

  const roleInfo = roleAccess[role] || roleAccess.employee;

  // Get chain of command (managers, owners, and marketing managers)
  const supervisors = teamMembers.filter(m => 
    (m.role === 'owner' || m.role === 'manager' || m.role === 'marketingManager') && m.role !== role
  );

  const steps = [
    {
      title: `Welcome to ${companyName}! 🎉`,
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${roleInfo.color} flex items-center justify-center text-white shadow-lg`}>
              {roleInfo.icon}
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to the Team!
            </h2>
            <p className="text-lg text-gray-600 mb-2">
              You've been added to <strong>{companyName}</strong> as a <strong>{roleInfo.title}</strong>
            </p>
            <p className="text-gray-500">
              We're excited to have you on board! Let's get you oriented.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Legal & Compliance',
      content: (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <FaFileContract className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Terms & Privacy Agreement
            </h3>
            <p className="text-gray-600">
              Please review and accept our legal documents to continue.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    I have read and agree to the{' '}
                    <Link 
                      to="/terms" 
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Terms of Service
                    </Link>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    By checking this box, you acknowledge that you understand and agree to be bound by our Terms of Service.
                  </p>
                </div>
              </label>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    I acknowledge the{' '}
                    <Link 
                      to="/privacy" 
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    You understand how we collect, use, and protect your personal data in accordance with GDPR regulations.
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          {(!termsAccepted || !privacyAccepted) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Required:</strong> You must accept both the Terms of Service and Privacy Policy to continue.
                </p>
              </div>
            </div>
          )}
        </div>
      ),
      canProceed: () => termsAccepted && privacyAccepted
    },
    {
      title: 'Your Role & Access',
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-gradient-to-r ${roleInfo.color} text-white shadow-md`}>
              {roleInfo.icon}
              <span className="text-xl font-bold">{roleInfo.title}</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What You Can Access:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roleInfo.access.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-blue-600 text-xl mt-1">{item.icon}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.module}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Chain of Command',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">
            Here's who you can reach out to for questions or support:
          </p>
          {supervisors.length > 0 ? (
            <div className="space-y-3">
              {supervisors.map((member, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#EAF4F6] to-[#D4F5EF] rounded-lg border border-blue-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#005C70] to-[#2F6F63] rounded-full flex items-center justify-center text-white font-bold">
                    {member.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 capitalize">{member.role}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    {onboardingData?.chainOfCommand?.[member.role] && (
                      <p className="text-xs text-gray-500 mt-1">
                        {onboardingData.chainOfCommand[member.role]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-600">No supervisors assigned. Contact the company owner for assistance.</p>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Your Responsibilities',
      content: (
        <div className="space-y-4">
          {onboardingData?.duties?.[role] ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Key Duties:</h3>
              <div className="space-y-2">
                {onboardingData.duties[role].map((duty, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <FaTasks className="text-green-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-700">{duty}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <FaTasks className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No specific duties assigned yet. Check with your manager for details.</p>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Work Schedule',
      content: (
        <div className="space-y-4">
          {onboardingData?.schedule?.[role] ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#F0FBF8] to-[#EAF4F6] rounded-lg border border-[#B8E5DC]">
                <FaClock className="text-[#005C70] text-2xl" />
                <div>
                  <p className="font-semibold text-gray-900">Start Time</p>
                  <p className="text-gray-600">{onboardingData.schedule[role].startTime || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <FaClock className="text-blue-600 text-2xl" />
                <div>
                  <p className="font-semibold text-gray-900">End Time</p>
                  <p className="text-gray-600">{onboardingData.schedule[role].endTime || 'Not specified'}</p>
                </div>
              </div>
              {onboardingData.schedule[role].notes && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-700">{onboardingData.schedule[role].notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <FaClock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Schedule details will be provided by your manager.</p>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Security Setup',
      content: (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <FaLock className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Secure Your Account
            </h3>
            <p className="text-gray-600">
              Let's make sure your account is secure before you get started.
            </p>
          </div>
          
          {/* Email Verification Section */}
          <div className={`p-6 rounded-lg border-2 ${
            emailVerified 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                emailVerified ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <FaEnvelope className={`w-6 h-6 ${
                  emailVerified ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Email Verification {emailVerified ? '✓ Verified' : '⚠ Required'}
                </h4>
                {emailVerified ? (
                  <p className="text-sm text-gray-700">
                    Your email address has been verified. Your account is secure!
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      Please verify your email address ({currentUser?.email}) to secure your account and enable password recovery.
                    </p>
                    {emailVerificationSent ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800 mb-2">
                            <strong>✓ Verification email sent!</strong> Please check your inbox and click the verification link.
                          </p>
                        </div>
                        <button
                          onClick={checkEmailVerification}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
                        >
                          ✓ I've Verified My Email
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleSendVerificationEmail}
                        disabled={verifyingEmail}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifyingEmail ? 'Sending...' : 'Send Verification Email'}
                      </button>
                    )}
                    <p className="text-xs text-gray-600">
                      <strong>Note:</strong> You can continue without verification, but we recommend verifying your email for account security.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Security Tips */}
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FaShieldAlt className="text-blue-600" />
              Security Best Practices
            </h4>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Use a strong, unique password</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Never share your login credentials</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Log out when using shared devices</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>Report suspicious activity immediately</span>
              </li>
            </ul>
          </div>
          
          {/* Future 2FA Option */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Coming Soon:</strong> Two-factor authentication (2FA) will be available in your account settings for enhanced security.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "You're All Set! 🚀",
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <FaRocket className="w-20 h-20 text-[#005C70]" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Get Started!
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              You now have access to {companyName}'s Biz-CoPilot platform.
            </p>
            <div className="bg-gradient-to-r from-[#F0FBF8] to-[#EAF4F6] rounded-lg p-6 border border-[#B8E5DC]">
              <p className="text-gray-700 mb-2">
                <strong>Next steps:</strong>
              </p>
              <ul className="text-left text-gray-600 space-y-2 max-w-md mx-auto">
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  Explore the modules you have access to
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  Review your assigned tasks and responsibilities
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  Reach out to your supervisor if you have questions
                </li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    // Check if current step has a validation function
    const currentStepData = steps[currentStep];
    if (currentStepData?.canProceed && !currentStepData.canProceed()) {
      return; // Don't proceed if validation fails
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0FBF8] via-[#E6F5F3] to-[#D4F5EF] p-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-2 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-[#005C70] to-[#00BFA6] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Step {currentStep + 1} of {steps.length}</span>
            </div>
          </div>

          <div className="min-h-[400px] mb-8">
            {steps[currentStep].content}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {currentStep > 0 ? '← Previous' : ''}
            </button>
            
            <button
              onClick={nextStep}
              disabled={steps[currentStep]?.canProceed && !steps[currentStep].canProceed()}
              className="px-8 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg font-semibold hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <FaArrowRight />
                </>
              ) : (
                <>
                  Get Started
                  <FaRocket />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberWelcomeWizard;

