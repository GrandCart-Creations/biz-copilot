/**
 * ONBOARDING WIZARD
 * 
 * Multi-step onboarding flow for new users
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import WelcomeStep from './steps/WelcomeStep';
import BusinessAssessmentStep from './steps/BusinessAssessmentStep';
import CompanySetupStep from './steps/CompanySetupStep';
import CompanyProfileStep from './steps/CompanyProfileStep';
import TeamInviteStep from './steps/TeamInviteStep';
import ModuleTourStep from './steps/ModuleTourStep';
import {
  FaCheck,
  FaChevronRight,
  FaChevronLeft,
  FaTimes
} from 'react-icons/fa';

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingStep, completeOnboarding, skipOnboarding } = useOnboarding();
  const { currentCompany, companies, createCompany, updateCompanyName } = useCompany();
  const { currentUser } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  // Steps configuration
  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Biz-CoPilot',
      component: WelcomeStep,
      canSkip: false,
      isOptional: false
    },
    {
      id: 'business-assessment',
      title: 'Business Assessment',
      component: BusinessAssessmentStep,
      canSkip: false,
      isOptional: false
    },
    {
      id: 'company-setup',
      title: 'Set Up Your Company',
      component: CompanySetupStep,
      canSkip: false,
      isOptional: false
    },
    {
      id: 'company-profile',
      title: 'Company Profile',
      component: CompanyProfileStep,
      canSkip: true,
      isOptional: false
    },
    {
      id: 'team-invite',
      title: 'Invite Your Team',
      component: TeamInviteStep,
      canSkip: true,
      isOptional: true
    },
    {
      id: 'module-tour',
      title: 'Module Tour',
      component: ModuleTourStep,
      canSkip: true,
      isOptional: true
    }
  ];

  useEffect(() => {
    if (onboardingData?.step !== undefined) {
      setCurrentStep(onboardingData.step);
    }
  }, [onboardingData]);

  useEffect(() => {
    const stepConfig = steps[currentStep];
    setCanSkip(stepConfig?.canSkip || false);
  }, [currentStep]);

  const handleNext = async (stepData = {}) => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateOnboardingStep(nextStep, stepData);
      
      // Auto-advance if step is optional and skipped
      if (steps[nextStep]?.isOptional && stepData.skip) {
        setTimeout(() => handleNext({ skip: true }), 100);
      }
    } else {
      // Final step - complete onboarding
      await completeOnboarding();
      navigate('/dashboard');
    }
  };

  const handlePrevious = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      await updateOnboardingStep(prevStep);
    }
  };

  const handleSkip = async () => {
    await skipOnboarding();
    navigate('/dashboard');
  };

  const handleComplete = async () => {
    await completeOnboarding();
    navigate('/dashboard');
  };

  const StepComponent = steps[currentStep]?.component;
  const stepProgress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{steps[currentStep]?.title}</h2>
              <p className="text-[#D4F5EF] text-sm mt-1">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
            {canSkip && (
              <button
                onClick={handleSkip}
                className="text-white hover:text-[#9FE4D8] transition-colors"
                title="Skip onboarding"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 bg-[#00BFA6] rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      index < currentStep
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? (
                      <FaCheck className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${
                    index === currentStep ? 'font-semibold text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {StepComponent && (
            <StepComponent
              onNext={(stepData = {}) => handleNext(stepData)}
              onPrevious={handlePrevious}
              onComplete={handleComplete}
              onSkip={handleSkip}
              currentStep={currentStep}
              totalSteps={steps.length}
              canProceed={true} // Pass validation state if needed
            />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              currentStep === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FaChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {steps[currentStep]?.isOptional && (
              <button
                onClick={() => handleNext({ skip: true })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Skip this step
              </button>
            )}
            <button
              onClick={() => handleNext()}
              className="px-6 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg font-medium hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;

