/**
 * CONFIGURATION COMPLETE STEP
 * 
 * Shows success message and next steps after configuration is applied
 */

import React from 'react';
import {
  FaCheckCircle,
  FaRocket,
  FaCog,
  FaChartLine,
  FaUsers,
  FaArrowRight
} from 'react-icons/fa';

const ConfigurationCompleteStep = ({ companyName, config }) => {
  return (
    <div className="text-center space-y-6 py-4">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <FaCheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <div className="absolute -top-2 -right-2">
            <FaRocket className="w-8 h-8 text-[#00BFA6]" />
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          {companyName} is Ready! 🎉
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          Your company has been configured and is ready to use.
        </p>
      </div>

      {/* Configuration Summary */}
      {config && (
        <div className="bg-gradient-to-r from-[#F0FBF8] to-[#EAF4F6] rounded-lg p-6 border border-[#B8E5DC] max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What's Been Set Up
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {config.modules && config.modules.length > 0 && (
              <div className="flex items-start gap-3">
                <FaCog className="w-5 h-5 text-[#005C70] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Modules Enabled</p>
                  <p className="text-sm text-gray-600">
                    {config.modules.length} module{config.modules.length !== 1 ? 's' : ''} activated
                  </p>
                </div>
              </div>
            )}
            {config.subscriptionTier && (
              <div className="flex items-start gap-3">
                <FaChartLine className="w-5 h-5 text-[#00BFA6] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Subscription Tier</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {config.subscriptionTier} Plan
                  </p>
                </div>
              </div>
            )}
            {config.settings?.businessType && (
              <div className="flex items-start gap-3">
                <FaUsers className="w-5 h-5 text-[#005C70] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Business Type</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {config.settings.businessType.replace('-', ' ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What's Next?
        </h3>
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3">
            <FaCheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Explore Your Dashboard</p>
              <p className="text-sm text-gray-600">
                Navigate through the enabled modules and familiarize yourself with the interface
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FaCheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Customize Settings</p>
              <p className="text-sm text-gray-600">
                Adjust modules, permissions, and preferences in Company Settings
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FaCheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Add Your First Data</p>
              <p className="text-sm text-gray-600">
                Start tracking expenses, income, or create your first invoice
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
        <p className="text-sm text-blue-800">
          <strong>Need help?</strong> You can always modify your company configuration, 
          add modules, or change settings from the Settings page. Our support team is 
          also available if you have any questions.
        </p>
      </div>
    </div>
  );
};

export default ConfigurationCompleteStep;

