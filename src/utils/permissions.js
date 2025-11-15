/**
 * PERMISSION UTILITIES
 * 
 * Role-Based Access Control (RBAC) system
 * Defines permissions for different roles and modules
 */

// Permission definitions per role
const ROLE_PERMISSIONS = {
  owner: {
    expenses: ['read', 'write', 'delete', 'export'],
    income: ['read', 'write', 'delete', 'export'],
    invoices: ['read', 'write', 'delete', 'export'],
    marketing: ['read', 'write', 'delete'],
    projects: ['read', 'write', 'delete', 'export'],
    forecasting: ['read', 'write', 'delete'],
    reports: ['read', 'write', 'export'],
    settings: ['read', 'write', 'delete'],
    team: ['read', 'write', 'delete']
  },
  manager: {
    expenses: ['read', 'write', 'delete'],
    income: ['read', 'write'],
    invoices: ['read', 'write', 'delete'],
    marketing: ['read', 'write'],
    projects: ['read', 'write', 'delete'],
    forecasting: ['read', 'write'], // Can create/edit forecasts
    reports: ['read', 'write', 'export'], // Can create and export reports
    settings: ['read', 'write'], // Access to company settings (except owner-only controls)
    team: ['read', 'write'] // Can view and manage team (except owner role changes)
  },
  employee: {
    expenses: ['read', 'write'], // Own expenses only (enforced in Firestore rules)
    income: ['read'],
    invoices: ['read'], // Can view invoices but not create/edit
    marketing: [],
    projects: ['read', 'write'], // Can view and create projects
    forecasting: [],
    reports: ['read'], // Own reports only
    settings: [],
    team: []
  },
  accountant: {
    expenses: ['read', 'export'],
    income: ['read', 'export'],
    invoices: ['read', 'export'],
    marketing: [],
    projects: ['read'], // Can view projects for financial tracking
    forecasting: ['read'],
    reports: ['read', 'export'],
    settings: [],
    team: []
  },
  marketingManager: {
    expenses: ['read'], // To understand budget and spending
    income: ['read'], // To see revenue impact of campaigns
    invoices: ['read'], // To see customer data and sales
    marketing: ['read', 'write', 'delete', 'export'], // Full marketing control
    projects: ['read', 'write'], // Can manage marketing projects
    forecasting: ['read'], // To see projections and plan campaigns
    reports: ['read', 'export'], // To measure marketing effectiveness
    settings: [], // No access to company settings
    team: ['read'] // To see team members for task assignment
  },
  developer: {
    // Software Engineer/Developer/Designer
    expenses: ['read'], // To track development costs
    income: ['read'], // To see product revenue
    invoices: ['read'], // To see customer feedback and issues
    marketing: ['read', 'write'], // Collaborate on product launches and marketing
    projects: ['read', 'write', 'delete', 'export'], // Full project control - software creation, testing, releases
    forecasting: ['read'], // To see product projections
    reports: ['read', 'export'], // To track product metrics and customer feedback
    settings: [], // No access to company settings
    team: ['read', 'write'] // Collaborate with team, manage testers and customer feedback
  },
  dataEntryClerk: {
    // Data Entry Clerk - Main duties: expense/invoice tracking, daily reports, customer support
    expenses: ['read', 'write', 'export'], // Track and input all incoming expenses
    income: ['read'], // View income for reporting
    invoices: ['read', 'write', 'export'], // Track and input invoices & receivables
    marketing: ['read', 'write'], // Assist and collaborate with marketing projects
    projects: ['read', 'write'], // Assist with projects, handle customer issues & feedback
    forecasting: ['read'], // View forecasts for reporting
    reports: ['read', 'write', 'export'], // Create daily reports of important issues
    settings: [], // No access to company settings
    team: ['read'] // View team members for collaboration
  }
};

// Required subscription tiers for modules
const MODULE_TIERS = {
  expenses: 'lite',
  income: 'lite',
  invoices: 'lite',
  marketing: 'business',
  projects: 'business',
  forecasting: 'business',
  reports: 'lite',
  settings: 'lite',
  team: 'business',
  security: 'lite'
};

// Subscription tier hierarchy
const TIER_LEVELS = {
  lite: 1,
  business: 2,
  enterprise: 3
};

/**
 * Check if user has permission for a specific action
 * @param {string} role - User role (owner, manager, employee, accountant, marketingManager, developer, dataEntryClerk)
 * @param {string} module - Module name (expenses, income, marketing, etc.)
 * @param {string} action - Action (read, write, delete, export)
 * @returns {boolean} - True if user has permission
 */
export function hasPermission(role, module, action) {
  if (!role || !module || !action) return false;

  // Handle case-insensitive lookup for camelCase role names
  const roleLower = role.toLowerCase();
  let rolePerms = ROLE_PERMISSIONS[roleLower];
  
  // If not found with lowercase, try to find by case-insensitive match
  if (!rolePerms) {
    const availableKeys = Object.keys(ROLE_PERMISSIONS);
    const matchedKey = availableKeys.find(key => key.toLowerCase() === roleLower);
    if (matchedKey) {
      rolePerms = ROLE_PERMISSIONS[matchedKey];
    }
  }
  
  if (!rolePerms) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[hasPermission] Role "${role}" (key: "${roleLower}") not found in ROLE_PERMISSIONS. Available keys:`, Object.keys(ROLE_PERMISSIONS));
    }
    return false;
  }

  const modulePerms = rolePerms[module.toLowerCase()];
  if (!modulePerms) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[hasPermission] Module "${module}" not found for role "${role}"`);
    }
    return false;
  }

  return modulePerms.includes(action.toLowerCase());
}

/**
 * Check if user can access a module
 * @param {string} role - User role
 * @param {string} subscriptionTier - Subscription tier (lite, business, enterprise)
 * @param {string} module - Module name
 * @returns {boolean} - True if user can access module
 */
export function canAccessModule(role, subscriptionTier, module) {
  if (!role || !subscriptionTier || !module) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[canAccessModule] Missing parameter: role=${role}, tier=${subscriptionTier}, module=${module}`);
    }
    return false;
  }

  // Check if role has any permissions for this module
  // Handle case-insensitive lookup for camelCase role names
  const roleLower = role.toLowerCase();
  let rolePerms = ROLE_PERMISSIONS[roleLower];
  
  // If not found with lowercase, try to find by case-insensitive match
  if (!rolePerms) {
    const availableKeys = Object.keys(ROLE_PERMISSIONS);
    const matchedKey = availableKeys.find(key => key.toLowerCase() === roleLower);
    if (matchedKey) {
      rolePerms = ROLE_PERMISSIONS[matchedKey];
    }
  }
  
  if (!rolePerms) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[canAccessModule] Role "${role}" (key: "${roleLower}") not found in ROLE_PERMISSIONS. Available keys:`, Object.keys(ROLE_PERMISSIONS));
    }
    return false;
  }

  const modulePerms = rolePerms[module.toLowerCase()];
  if (!modulePerms || modulePerms.length === 0) {
    if (process.env.NODE_ENV === 'development' && role === 'dataEntryClerk') {
      console.warn(`[canAccessModule] Module "${module}" not found or empty for role "${role}". Available modules:`, Object.keys(rolePerms));
    }
    return false;
  }

  // Check subscription tier
  const requiredTier = MODULE_TIERS[module.toLowerCase()];
  if (!requiredTier) {
    // No tier requirement - allow access if role has permissions
    return true;
  }

  const userTierLevel = TIER_LEVELS[subscriptionTier.toLowerCase()] || 0;
  const requiredTierLevel = TIER_LEVELS[requiredTier.toLowerCase()] || 0;

  const canAccess = userTierLevel >= requiredTierLevel;
  
  if (process.env.NODE_ENV === 'development' && !canAccess && role === 'dataEntryClerk') {
    console.warn(`[canAccessModule] Tier check failed: userTier=${subscriptionTier} (level ${userTierLevel}) < requiredTier=${requiredTier} (level ${requiredTierLevel}) for module="${module}"`);
  }

  return canAccess;
}

/**
 * Get all modules user can access
 * @param {string} role - User role
 * @param {string} subscriptionTier - Subscription tier
 * @param {array} accessModules - Explicitly enabled modules (optional)
 * @returns {array} - Array of accessible module names
 */
export function getAccessibleModules(role, subscriptionTier, accessModules = null) {
  // If accessModules is explicitly set, use that (for custom permissions)
  if (accessModules && Array.isArray(accessModules)) {
    return accessModules.filter(module => 
      canAccessModule(role, subscriptionTier, module)
    );
  }

  // Otherwise, calculate based on role and tier
  const allModules = Object.keys(MODULE_TIERS);
  return allModules.filter(module => 
    canAccessModule(role, subscriptionTier, module)
  );
}

/**
 * Check if user can write to a resource (must check ownership separately in Firestore)
 * @param {string} role - User role
 * @param {string} module - Module name
 * @returns {boolean} - True if user can write
 */
export function canWrite(role, module) {
  return hasPermission(role, module, 'write');
}

/**
 * Check if user can delete a resource
 * @param {string} role - User role
 * @param {string} module - Module name
 * @returns {boolean} - True if user can delete
 */
export function canDelete(role, module) {
  return hasPermission(role, module, 'delete');
}

/**
 * Check if user can export data
 * @param {string} role - User role
 * @param {string} module - Module name
 * @returns {boolean} - True if user can export
 */
export function canExport(role, module) {
  return hasPermission(role, module, 'export');
}

/**
 * Get user's role permissions object
 * @param {string} role - User role
 * @returns {object} - Permissions object for the role
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role?.toLowerCase()] || {};
}

export default {
  hasPermission,
  canAccessModule,
  getAccessibleModules,
  canWrite,
  canDelete,
  canExport,
  getRolePermissions,
  ROLE_PERMISSIONS,
  MODULE_TIERS,
  TIER_LEVELS
};

// Export constants for use in other modules
export { MODULE_TIERS, TIER_LEVELS, ROLE_PERMISSIONS };

