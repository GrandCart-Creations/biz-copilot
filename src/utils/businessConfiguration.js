/**
 * BUSINESS CONFIGURATION UTILITY
 * 
 * Auto-configures company settings based on business assessment
 */

/**
 * Generate company configuration from business assessment
 * @param {Object} assessment - Business assessment data
 * @returns {Object} Company configuration
 */
export const generateCompanyConfiguration = (assessment) => {
  if (!assessment) {
    return getDefaultConfiguration();
  }

  const config = {
    modules: assessment.recommendedModules || ['expenses', 'income', 'financialDashboard'],
    settings: {
      businessType: assessment.businessType,
      businessCategory: assessment.businessCategory,
      employeeCount: assessment.employeeCount || 1,
      hasAccountant: assessment.hasAccountant || false,
      features: {
        invoicing: assessment.needsInvoicing !== false, // Default to true
        projects: assessment.needsProjects || false,
        marketing: assessment.needsMarketing || false,
        forecasting: assessment.needsForecasting || false
      }
    },
    accessModules: assessment.recommendedModules || ['expenses', 'income', 'financialDashboard'],
    subscriptionTier: determineSubscriptionTier(assessment)
  };

  return config;
};

/**
 * Get default configuration
 * @returns {Object} Default configuration
 */
const getDefaultConfiguration = () => {
  return {
    modules: ['expenses', 'income', 'financialDashboard'],
    settings: {
      businessType: 'sole-proprietor',
      businessCategory: 'other',
      employeeCount: 1,
      hasAccountant: false,
      features: {
        invoicing: true,
        projects: false,
        marketing: false,
        forecasting: false
      }
    },
    accessModules: ['expenses', 'income', 'financialDashboard'],
    subscriptionTier: 'business'
  };
};

/**
 * Determine subscription tier based on assessment
 * @param {Object} assessment - Business assessment
 * @returns {string} Subscription tier
 */
const determineSubscriptionTier = (assessment) => {
  const employeeCount = assessment.employeeCount || 1;
  
  if (employeeCount >= 50) {
    return 'enterprise';
  } else if (employeeCount >= 20) {
    return 'professional';
  } else {
    return 'business';
  }
};

/**
 * Apply configuration to company
 * @param {Object} companyData - Existing company data
 * @param {Object} config - Configuration to apply
 * @returns {Object} Updated company data
 */
export const applyConfigurationToCompany = (companyData, config) => {
  return {
    ...companyData,
    settings: {
      ...companyData.settings,
      ...config.settings,
      configuredModules: config.modules,
      configuredAt: new Date()
    },
    accessModules: config.accessModules,
    subscriptionTier: config.subscriptionTier
  };
};

