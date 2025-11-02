/**
 * SUBSCRIPTION GATE COMPONENT
 * 
 * Displays a message when user tries to access a feature
 * that requires a higher subscription tier
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaArrowUp, FaCheckCircle } from 'react-icons/fa';
import { useCompany } from '../contexts/CompanyContext';

const SubscriptionGate = ({ requiredTier, currentTier, moduleName }) => {
  const navigate = useNavigate();
  const { subscriptionTier } = useCompany();

  const tierNames = {
    lite: 'Lite',
    business: 'Business',
    enterprise: 'Enterprise'
  };

  const tierFeatures = {
    business: [
      'Marketing module',
      'Forecasting & projections',
      'Team collaboration',
      'Advanced reports',
      'Priority support'
    ],
    enterprise: [
      'Everything in Business',
      'Multi-company management',
      'API access',
      'Custom integrations',
      'Dedicated support'
    ]
  };

  const handleUpgrade = () => {
    // Navigate to upgrade page (to be implemented)
    alert('Upgrade functionality coming soon!');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaLock className="w-10 h-10 text-yellow-600" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {moduleName} Requires {tierNames[requiredTier]} Tier
        </h2>
        
        <p className="text-lg text-gray-600 mb-8">
          Your current <strong>{tierNames[currentTier]}</strong> subscription doesn't include access to this module.
          Upgrade to unlock this feature and more.
        </p>

        {/* Current vs Required */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-600">{tierNames[currentTier]}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 font-medium">Your Current Plan</p>
          </div>
          
          <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <FaArrowUp className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-sm text-blue-700 font-medium">{tierNames[requiredTier]} Required</p>
          </div>
        </div>

        {/* Features List */}
        {tierFeatures[requiredTier] && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4">Upgrade to {tierNames[requiredTier]} includes:</h3>
            <ul className="space-y-2">
              {tierFeatures[requiredTier].map((feature, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <FaCheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={handleUpgrade}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FaArrowUp className="w-4 h-4" />
            Upgrade Now
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact support at <a href="mailto:support@biz-copilot.nl" className="text-blue-600 hover:underline">support@biz-copilot.nl</a>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionGate;

