/**
 * MODULE CONFIGURATION
 * 
 * Defines all available modules, their metadata, permissions, and tier requirements
 */

import { hasPermission, canAccessModule, MODULE_TIERS, TIER_LEVELS } from './permissions';

// Module definitions
export const MODULES = {
  expenses: {
    id: 'expenses',
    name: 'Expenses',
    description: 'Track and manage business expenses',
    icon: 'FaChartLine',
    color: 'blue',
    route: '/modules/expenses',
    requiredPermission: 'expenses',
    requiredTier: 'lite',
    status: 'active' // active, coming-soon, beta
  },
  income: {
    id: 'income',
    name: 'Income',
    description: 'Track revenue and income streams',
    icon: 'FaDollarSign',
    color: 'green',
    route: '/modules/income',
    requiredPermission: 'income:read',
    requiredTier: 'lite',
    status: 'active'
  },
  invoices: {
    id: 'invoices',
    name: 'Invoices',
    description: 'Manage quotes, invoices, and subscriptions (Accounts Receivable)',
    icon: 'FaFileInvoiceDollar',
    color: 'purple',
    route: '/modules/invoices',
    requiredPermission: 'invoices:read',
    requiredTier: 'lite',
    status: 'active'
  },
  financialDashboard: {
    id: 'financialDashboard',
    name: 'Financial Dashboard',
    description: 'Comprehensive financial insights and analytics',
    icon: 'FaChartArea',
    color: 'indigo',
    route: '/modules/financial-dashboard',
    requiredPermission: '*',
    requiredTier: 'lite',
    status: 'active'
  },
  reports: {
    id: 'reports',
    name: 'Reports',
    description: 'Financial reports and analytics',
    icon: 'FaFileAlt',
    color: 'purple',
    route: '/modules/reports',
    requiredPermission: 'reports:read',
    requiredTier: 'lite',
    status: 'active'
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing',
    description: 'Marketing campaigns, social media, and collaboration',
    icon: 'FaBullhorn',
    color: 'orange',
    route: '/modules/marketing',
    requiredPermission: 'marketing:read',
    requiredTier: 'business',
    status: 'active'
  },
  projects: {
    id: 'projects',
    name: 'Projects',
    description: 'Manage projects and products - adaptable to any business type',
    icon: 'FaProjectDiagram',
    color: 'indigo',
    route: '/modules/projects',
    requiredPermission: 'projects:read',
    requiredTier: 'business',
    status: 'active'
  },
  forecasting: {
    id: 'forecasting',
    name: 'Forecasting',
    description: 'Financial forecasting and projections',
    icon: 'FaChartLine',
    color: 'indigo',
    route: '/modules/forecasting',
    requiredPermission: 'forecasting:read',
    requiredTier: 'business',
    status: 'active'
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    description: 'Company and account settings',
    icon: 'FaCog',
    color: 'gray',
    route: '/modules/settings',
    requiredPermission: 'settings:read',
    requiredTier: 'lite',
    status: 'active'
  },
  team: {
    id: 'team',
    name: 'Team',
    description: 'Team management and collaboration',
    icon: 'FaUsers',
    color: 'teal',
    route: '/modules/team',
    requiredPermission: 'team:read',
    requiredTier: 'business',
    status: 'active'
  },
  security: {
    id: 'security',
    name: 'Security',
    description: 'Security dashboard and audit logs',
    icon: 'FaShieldAlt',
    color: 'red',
    route: '/security/dashboard',
    requiredPermission: '*', // Only owners/admins
    requiredTier: 'lite',
    status: 'active'
  }
};

/**
 * Get visible modules for a user based on their role and subscription tier
 * @param {string} role - User role (owner, manager, employee, accountant)
 * @param {string} subscriptionTier - Subscription tier (lite, business, enterprise)
 * @returns {Array} Array of visible module objects
 */
export function getVisibleModules(role, subscriptionTier) {
  return Object.values(MODULES).filter(module => {
    // Check if module is active (not coming-soon for now)
    if (module.status === 'coming-soon') {
      return false; // Hide coming-soon modules for now
    }
    
    // For modules with '*' permission (like security), handle specially
    if (module.requiredPermission === '*') {
      // Security module: only owners/admins can access, check tier requirement
      const hasAccess = (role === 'owner' || role === 'admin');
      const tierAccess = meetsTierRequirement(subscriptionTier || 'business', module.requiredTier || 'lite');
      return hasAccess && tierAccess;
    }
    
    // For other modules, check permission and tier
    // Parse requiredPermission (e.g., "expenses" or "income:read")
    let permissionModule = module.id;
    let permissionAction = 'read';
    
    if (module.requiredPermission && module.requiredPermission.includes(':')) {
      const [mod, action] = module.requiredPermission.split(':');
      permissionModule = mod;
      permissionAction = action;
    } else if (module.requiredPermission) {
      permissionModule = module.requiredPermission;
    }
    
    const hasAccess = hasPermission(role, permissionModule, permissionAction);
    const tierAccess = canAccessModule(role, subscriptionTier, module.id);
    
    // Debug logging for development
    if (process.env.NODE_ENV === 'development' && role === 'dataEntryClerk') {
      console.log(`[getVisibleModules] Module "${module.id}" (${module.name}): hasAccess=${hasAccess} (checking ${permissionModule}:${permissionAction}), tierAccess=${tierAccess}, role=${role}, tier=${subscriptionTier}, result=${hasAccess && tierAccess}`);
    }
    
    const result = hasAccess && tierAccess;
    return result;
  });
}

/**
 * Get module by ID
 * @param {string} moduleId - Module ID
 * @returns {Object|null} Module object or null
 */
export function getModule(moduleId) {
  return MODULES[moduleId] || null;
}

/**
 * Check if a module is accessible
 * @param {string} moduleId - Module ID
 * @param {string} role - User role
 * @param {string} subscriptionTier - Subscription tier
 * @returns {boolean} True if accessible
 */
export function isModuleAccessible(moduleId, role, subscriptionTier) {
  const module = getModule(moduleId);
  if (!module) return false;
  
  const hasAccess = hasPermission(role, module.id, 'read') || 
                    (module.requiredPermission === '*' && (role === 'owner' || role === 'admin'));
  const tierAccess = canAccessModule(role, subscriptionTier, module.id);
  
  return hasAccess && tierAccess && module.status === 'active';
}

/**
 * Check if user's tier meets module requirement
 * @param {string} userTier - User's current subscription tier
 * @param {string} requiredTier - Required tier for module
 * @returns {boolean} True if user tier meets requirement
 */
export function meetsTierRequirement(userTier, requiredTier) {
  const tierLevels = {
    lite: 1,
    business: 2,
    enterprise: 3
  };
  
  const userLevel = tierLevels[userTier?.toLowerCase()] || 0;
  const requiredLevel = tierLevels[requiredTier?.toLowerCase()] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Get the required tier for a module
 * @param {string} moduleId - Module ID
 * @returns {string|null} Required tier or null
 */
export function getModuleRequiredTier(moduleId) {
  const module = getModule(moduleId);
  return module?.requiredTier || null;
}

/**
 * MODULE SECTIONS
 * Groups modules into logical sections for sidebar navigation
 */
export const MODULE_SECTIONS = [
  {
    id: 'financial',
    title: 'Financial',
    color: 'blue',
    icon: 'FaChartLine',
    modules: ['expenses', 'income', 'invoices', 'financialDashboard', 'reports']
  },
  {
    id: 'operations',
    title: 'Operations',
    color: 'orange',
    icon: 'FaProjectDiagram',
    modules: ['marketing', 'projects', 'forecasting']
  },
  {
    id: 'administration',
    title: 'Administration',
    color: 'gray',
    icon: 'FaCog',
    modules: ['settings', 'team', 'security']
  }
];

/**
 * Get modules grouped by sections
 * @param {string} role - User role
 * @param {string} subscriptionTier - Subscription tier
 * @returns {Array} Array of section objects with their visible modules
 */
export function getModulesBySections(role, subscriptionTier) {
  const visibleModules = getVisibleModules(role, subscriptionTier);
  const visibleModuleIds = new Set(visibleModules.map(m => m.id));
  
  return MODULE_SECTIONS.map(section => ({
    ...section,
    modules: section.modules
      .map(moduleId => getModule(moduleId))
      .filter(module => module && visibleModuleIds.has(module.id))
  })).filter(section => section.modules.length > 0);
}

