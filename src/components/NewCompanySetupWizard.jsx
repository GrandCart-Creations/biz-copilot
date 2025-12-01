/**
 * NEW COMPANY SETUP WIZARD
 * 
 * Wizard for configuring additional companies after creation
 * Multi-step flow: Assessment -> Review -> Apply -> Complete
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import BusinessAssessmentStep from './Onboarding/steps/BusinessAssessmentStep';
import ConfigurationReviewStep from './Onboarding/steps/ConfigurationReviewStep';
import ConfigurationCompleteStep from './Onboarding/steps/ConfigurationCompleteStep';
import { generateCompanyConfiguration } from '../utils/businessConfiguration';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FaCheck,
  FaChevronRight,
  FaChevronLeft,
  FaTimes,
  FaBuilding
} from 'react-icons/fa';

const NewCompanySetupWizard = ({ companyId, companyName, onComplete, onSkip }) => {
  const { currentCompany, refreshCompany } = useCompany();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentData, setAssessmentData] = useState(null);
  const [appliedConfig, setAppliedConfig] = useState(null);
  const [configuring, setConfiguring] = useState(false);

  // Log when wizard mounts
  useEffect(() => {
    console.log('[NewCompanySetupWizard] Wizard mounted:', { companyId, companyName });
    return () => {
      console.log('[NewCompanySetupWizard] Wizard unmounting');
    };
  }, [companyId, companyName]);

  const steps = [
    {
      id: 'business-assessment',
      title: 'Tell Us About Your Business',
      component: BusinessAssessmentStep,
      description: 'Help us customize Biz-CoPilot to fit your business needs'
    },
    {
      id: 'review',
      title: 'Review Configuration',
      component: ConfigurationReviewStep,
      description: 'Review the settings that will be applied'
    },
    {
      id: 'complete',
      title: 'Setup Complete',
      component: ConfigurationCompleteStep,
      description: 'Your company is ready to use'
    }
  ];

  const handleAssessmentComplete = (data) => {
    console.log('[NewCompanySetupWizard] Assessment completed:', data);
    setAssessmentData(data);
    // Move to review step
    setCurrentStep(1);
  };

  const handleReviewConfirm = async () => {
    if (!assessmentData) return;
    
    // Move to applying step (show loading)
    setConfiguring(true);
    await handleApplyConfiguration(assessmentData);
  };

  const handleApplyConfiguration = async (data) => {
    if (!companyId || !data) {
      setConfiguring(false);
      return;
    }

    try {
      // Generate configuration from assessment
      const config = generateCompanyConfiguration(data);
      
      console.log('[NewCompanySetupWizard] Applying configuration:', {
        companyId,
        assessmentData: data,
        config
      });

      // Update company document with configuration
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        'settings.country': config.settings.country || 'NL',
        'settings.currency': config.settings.currency || 'EUR',
        'settings.taxRules': config.settings.taxRules || { rates: [0, 9, 21], country: 'NL' },
        'settings.configuredModules': config.modules,
        'settings.businessType': data.businessType,
        'settings.businessCategory': data.businessCategory,
        'settings.employeeCount': data.employeeCount,
        'settings.hasAccountant': data.hasAccountant,
        'settings.configuredAt': new Date().toISOString(),
        updatedAt: serverTimestamp()
      });

      // Update user's access modules for this company
      if (currentUser) {
        const userRef = doc(db, 'companies', companyId, 'users', currentUser.uid);
        try {
          await updateDoc(userRef, {
            accessModules: config.accessModules,
            subscriptionTier: config.subscriptionTier
          });
        } catch (userUpdateError) {
          // If user document doesn't exist, create it
          if (userUpdateError.code === 'not-found') {
            console.log('[NewCompanySetupWizard] User document not found, creating it...');
            await setDoc(userRef, {
              role: 'owner',
              accessModules: config.accessModules,
              subscriptionTier: config.subscriptionTier,
              addedAt: serverTimestamp()
            });
          } else {
            throw userUpdateError;
          }
        }
      }

      // Refresh company data to update local state
      try {
        await refreshCompany();
        console.log('[NewCompanySetupWizard] Company data refreshed');
      } catch (refreshError) {
        console.warn('[NewCompanySetupWizard] Could not refresh company data:', refreshError);
        // Don't fail the whole process if refresh fails
      }

      // Store applied config and move to completion step
      setAppliedConfig(config);
      setConfiguring(false);
      setCurrentStep(2); // Move to completion step

      // Mark as configured
      sessionStorage.removeItem(`pendingCompanySetup_${companyId}`);
    } catch (error) {
      console.error('[NewCompanySetupWizard] Error applying company configuration:', error);
      console.error('[NewCompanySetupWizard] Error details:', {
        code: error.code,
        message: error.message,
        companyId,
        userId: currentUser?.uid
      });
      setConfiguring(false);
      alert(`Failed to apply configuration: ${error.message || 'Unknown error'}. You can configure it later in Settings.`);
      // Go back to review step on error
      setCurrentStep(1);
    }
  };

  const handleSkip = () => {
    sessionStorage.removeItem(`pendingCompanySetup_${companyId}`);
    if (onSkip) {
      onSkip();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    sessionStorage.removeItem(`pendingCompanySetup_${companyId}`);
    if (onComplete) {
      onComplete({ configured: true, config: appliedConfig });
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const isLastStep = currentStep === steps.length - 1;
  const isReviewStep = currentStep === 1;
  const isCompleteStep = currentStep === 2;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4F5EF] rounded-lg flex items-center justify-center">
              <FaBuilding className="w-5 h-5 text-[#005C70]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Set Up {companyName}
              </h2>
              <p className="text-sm text-gray-500">
                {steps[currentStep].description}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Skip setup (you can configure later)"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      index < currentStep
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-[#00BFA6] text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index < currentStep ? (
                      <FaCheck className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 w-12 ${
                        index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {configuring ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mb-4"></div>
              <p className="text-gray-600 font-medium">Applying configuration...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
          ) : (
            <CurrentStepComponent
              onNext={(data) => {
                if (isReviewStep) {
                  handleReviewConfirm();
                } else if (currentStep === 0) {
                  handleAssessmentComplete(data);
                } else if (isCompleteStep) {
                  handleComplete();
                }
              }}
              onPrevious={currentStep > 0 ? handlePrevious : null}
              assessmentData={assessmentData}
              companyName={companyName}
              config={appliedConfig}
            />
          )}
        </div>

        {/* Footer */}
        {!configuring && !isCompleteStep && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                >
                  <FaChevronLeft className="w-4 h-4" />
                  Previous
                </button>
              )}
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip Setup
              </button>
            </div>
            <div className="flex items-center gap-3">
              {isReviewStep && (
                <button
                  onClick={handleReviewConfirm}
                  className="px-6 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg font-medium hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
                >
                  Apply Configuration
                  <FaChevronRight className="w-4 h-4" />
                </button>
              )}
              <div className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
          </div>
        )}

        {/* Footer for Complete Step */}
        {!configuring && isCompleteStep && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center">
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg font-medium hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
            >
              Get Started
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewCompanySetupWizard;

