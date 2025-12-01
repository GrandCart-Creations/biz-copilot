/**
 * CONFIGURATION REVIEW STEP
 * 
 * Shows a summary of the configuration that will be applied
 */

import React from 'react';
import {
  FaCheckCircle,
  FaBuilding,
  FaIndustry,
  FaUsers,
  FaFileInvoice,
  FaChartLine,
  FaUserTie,
  FaCog
} from 'react-icons/fa';
import { generateCompanyConfiguration } from '../../../utils/businessConfiguration';

const ConfigurationReviewStep = ({ assessmentData, companyName, onNext, onPrevious }) => {
  if (!assessmentData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No configuration data available.</p>
      </div>
    );
  }

  const config = generateCompanyConfiguration(assessmentData);

  const getBusinessTypeName = (type) => {
    const types = {
      'sole-proprietor': 'Sole Proprietor',
      'partnership': 'Partnership',
      'llc': 'LLC / BV',
      'corporation': 'Corporation / NV'
    };
    return types[type] || type;
  };

  const getBusinessCategoryName = (category) => {
    const categories = {
      'retail': 'Retail & E-commerce',
      'services': 'Professional Services',
      'technology': 'Technology / SaaS',
      'manufacturing': 'Manufacturing',
      'hospitality': 'Hospitality & Food',
      'other': 'Other'
    };
    return categories[category] || category;
  };

  const getModuleName = (module) => {
    const modules = {
      'expenses': 'Expense Tracking',
      'income': 'Income Tracking',
      'invoices': 'Invoicing & Receivables',
      'financialDashboard': 'Financial Dashboard',
      'projects': 'Project Management',
      'marketing': 'Marketing Campaigns',
      'forecasting': 'Financial Forecasting',
      'team': 'Team Management'
    };
    return modules[module] || module;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review Your Configuration
        </h2>
        <p className="text-gray-600">
          Please review the settings that will be applied to <strong>{companyName}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Information */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <FaBuilding className="w-5 h-5 text-[#005C70]" />
            <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Business Structure</p>
              <p className="font-medium text-gray-900">
                {getBusinessTypeName(assessmentData.businessType)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Business Category</p>
              <p className="font-medium text-gray-900">
                {getBusinessCategoryName(assessmentData.businessCategory)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Team Size</p>
              <p className="font-medium text-gray-900">
                {assessmentData.employeeCount || 1} {assessmentData.employeeCount === 1 ? 'person' : 'people'}
              </p>
            </div>
            {assessmentData.hasAccountant && (
              <div className="flex items-center gap-2 text-green-600">
                <FaCheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Accountant Access Enabled</span>
              </div>
            )}
          </div>
        </div>

        {/* Enabled Modules */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <FaCog className="w-5 h-5 text-[#00BFA6]" />
            <h3 className="text-lg font-semibold text-gray-900">Enabled Modules</h3>
          </div>
          <div className="space-y-2">
            {config.modules && config.modules.length > 0 ? (
              config.modules.map((module) => (
                <div key={module} className="flex items-center gap-2 text-gray-700">
                  <FaCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{getModuleName(module)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No modules selected</p>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Tier */}
      <div className="bg-gradient-to-r from-[#F0FBF8] to-[#EAF4F6] rounded-lg p-6 border border-[#B8E5DC]">
        <div className="flex items-center gap-3 mb-3">
          <FaChartLine className="w-5 h-5 text-[#005C70]" />
          <h3 className="text-lg font-semibold text-gray-900">Subscription Tier</h3>
        </div>
        <p className="text-gray-700">
          Based on your business needs, we've recommended the{' '}
          <strong className="text-[#005C70]">{config.subscriptionTier || 'Starter'}</strong> tier.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          You can upgrade or modify your subscription at any time in Settings.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> All settings can be modified later in your Company Settings. 
          This configuration provides a starting point tailored to your business type.
        </p>
      </div>
    </div>
  );
};

export default ConfigurationReviewStep;

