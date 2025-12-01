/**
 * BUSINESS ASSESSMENT STEP
 * 
 * Step 2: Assess business type, structure, and requirements
 * This step collects information to auto-configure the company setup
 */

import React, { useState } from 'react';
import {
  FaBuilding,
  FaIndustry,
  FaStore,
  FaLaptopCode,
  FaHandshake,
  FaChartLine,
  FaUserTie,
  FaUsers,
  FaFileInvoice,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronRight
} from 'react-icons/fa';

const BUSINESS_TYPES = [
  {
    id: 'sole-proprietor',
    name: 'Sole Proprietor',
    icon: FaUserTie,
    description: 'Single owner business',
    modules: ['expenses', 'income', 'invoices', 'financialDashboard']
  },
  {
    id: 'partnership',
    name: 'Partnership',
    icon: FaHandshake,
    description: 'Two or more owners',
    modules: ['expenses', 'income', 'invoices', 'financialDashboard', 'team']
  },
  {
    id: 'llc',
    name: 'LLC / BV',
    icon: FaBuilding,
    description: 'Limited Liability Company',
    modules: ['expenses', 'income', 'invoices', 'financialDashboard', 'team', 'contracts']
  },
  {
    id: 'corporation',
    name: 'Corporation / NV',
    icon: FaIndustry,
    description: 'Large corporation',
    modules: ['expenses', 'income', 'invoices', 'financialDashboard', 'team', 'contracts', 'funding']
  }
];

const BUSINESS_CATEGORIES = [
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    icon: FaStore,
    description: 'Selling products online or in-store',
    modules: ['expenses', 'income', 'invoices', 'marketing', 'projects']
  },
  {
    id: 'services',
    name: 'Professional Services',
    icon: FaHandshake,
    description: 'Consulting, legal, accounting, etc.',
    modules: ['expenses', 'income', 'invoices', 'projects', 'contracts']
  },
  {
    id: 'tech',
    name: 'Technology / SaaS',
    icon: FaLaptopCode,
    description: 'Software development, apps, platforms',
    modules: ['expenses', 'income', 'invoices', 'projects', 'marketing', 'forecasting']
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: FaIndustry,
    description: 'Production and manufacturing',
    modules: ['expenses', 'income', 'invoices', 'projects', 'forecasting']
  },
  {
    id: 'agency',
    name: 'Agency / Creative',
    icon: FaChartLine,
    description: 'Marketing, design, advertising',
    modules: ['expenses', 'income', 'invoices', 'marketing', 'projects', 'team']
  },
  {
    id: 'other',
    name: 'Other',
    icon: FaBuilding,
    description: 'Other business type',
    modules: ['expenses', 'income', 'invoices', 'financialDashboard']
  }
];

const EMPLOYEE_COUNTS = [
  { id: '1', label: 'Just me (Solo)', value: 1 },
  { id: '2-5', label: '2-5 employees', value: 3 },
  { id: '6-20', label: '6-20 employees', value: 13 },
  { id: '21-50', label: '21-50 employees', value: 35 },
  { id: '50+', label: '50+ employees', value: 50 }
];

const BusinessAssessmentStep = ({ onNext, onPrevious }) => {
  const [businessType, setBusinessType] = useState(null);
  const [businessCategory, setBusinessCategory] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(null);
  const [hasAccountant, setHasAccountant] = useState(false);
  const [needsInvoicing, setNeedsInvoicing] = useState(true);
  const [needsProjects, setNeedsProjects] = useState(false);
  const [needsMarketing, setNeedsMarketing] = useState(false);
  const [needsForecasting, setNeedsForecasting] = useState(false);

  const handleNext = () => {
    // Validate required fields
    if (!canProceed) {
      return; // Don't proceed if validation fails
    }

    // Determine recommended modules based on selections
    const recommendedModules = [];
    
    // Base modules (always included)
    recommendedModules.push('expenses', 'income', 'financialDashboard');
    
    // Based on business type
    if (businessType) {
      const typeConfig = BUSINESS_TYPES.find(t => t.id === businessType);
      if (typeConfig) {
        recommendedModules.push(...typeConfig.modules);
      }
    }
    
    // Based on business category
    if (businessCategory) {
      const categoryConfig = BUSINESS_CATEGORIES.find(c => c.id === businessCategory);
      if (categoryConfig) {
        recommendedModules.push(...categoryConfig.modules);
      }
    }
    
    // Based on specific needs
    if (needsInvoicing) recommendedModules.push('invoices');
    if (needsProjects) recommendedModules.push('projects');
    if (needsMarketing) recommendedModules.push('marketing');
    if (needsForecasting) recommendedModules.push('forecasting');
    
    // If has employees or accountant, add team module
    if (employeeCount && employeeCount.value > 1) recommendedModules.push('team');
    if (hasAccountant) recommendedModules.push('team');
    
    // Remove duplicates
    const uniqueModules = [...new Set(recommendedModules)];
    
    // Pass assessment data to next step
    onNext({
      businessType,
      businessCategory,
      employeeCount: employeeCount?.value || 1,
      hasAccountant,
      needsInvoicing,
      needsProjects,
      needsMarketing,
      needsForecasting,
      recommendedModules: uniqueModules,
      assessmentComplete: true
    });
  };

  const canProceed = businessType && businessCategory && employeeCount;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Tell Us About Your Business
        </h2>
        <p className="text-gray-600">
          Help us customize Biz-CoPilot to fit your business needs perfectly.
        </p>
      </div>

      <div className="space-y-8">
        {/* Business Structure */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaBuilding className="w-5 h-5 text-blue-600" />
            Business Structure
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            What is your legal business structure?
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BUSINESS_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = businessType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setBusinessType(type.id)}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    {isSelected && <FaCheckCircle className="w-5 h-5 text-blue-600 ml-auto" />}
                  </div>
                  <div className="font-semibold text-gray-900">{type.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Business Category */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaIndustry className="w-5 h-5 text-green-600" />
            Business Category
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            What industry or type of business do you operate?
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BUSINESS_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isSelected = businessCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setBusinessCategory(category.id)}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    isSelected
                      ? 'border-green-600 bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                    {isSelected && <FaCheckCircle className="w-5 h-5 text-green-600 ml-auto" />}
                  </div>
                  <div className="font-semibold text-gray-900">{category.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Team Size */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaUsers className="w-5 h-5 text-purple-600" />
            Team Size
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            How many people work in your business?
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {EMPLOYEE_COUNTS.map((count) => {
              const isSelected = employeeCount?.id === count.id;
              return (
                <button
                  key={count.id}
                  onClick={() => setEmployeeCount(count)}
                  className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50 text-purple-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {count.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaFileInvoice className="w-5 h-5 text-orange-600" />
            Additional Features
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the features you need (you can change these later):
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={needsInvoicing}
                onChange={(e) => setNeedsInvoicing(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Invoicing & Receivables</div>
                <div className="text-sm text-gray-500">Create and track invoices</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={needsProjects}
                onChange={(e) => setNeedsProjects(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Project Management</div>
                <div className="text-sm text-gray-500">Track projects and timelines</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={needsMarketing}
                onChange={(e) => setNeedsMarketing(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Marketing Campaigns</div>
                <div className="text-sm text-gray-500">Plan and track marketing activities</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={needsForecasting}
                onChange={(e) => setNeedsForecasting(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Financial Forecasting</div>
                <div className="text-sm text-gray-500">Budget planning and predictions</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAccountant}
                onChange={(e) => setHasAccountant(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">I work with an Accountant</div>
                <div className="text-sm text-gray-500">Enable accountant access features</div>
              </div>
            </label>
          </div>
        </div>

        {!canProceed && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Please complete all required fields to continue:
                </p>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  {!businessType && <li>Select your Business Structure</li>}
                  {!businessCategory && <li>Select your Business Category</li>}
                  {!employeeCount && <li>Select your Team Size</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Next Button - shown when used in NewCompanySetupWizard */}
        {onNext && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                canProceed
                  ? 'bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white hover:from-[#014A5A] hover:to-[#019884]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessAssessmentStep;

