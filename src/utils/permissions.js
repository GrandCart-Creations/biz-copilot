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
    marketing: ['read', 'write', 'delete'],
    forecasting: ['read', 'write', 'delete'],
    reports: ['read', 'write', 'export'],
    settings: ['read', 'write', 'delete'],
    team: ['read', 'write', 'delete']
  },
  manager: {
    expenses: ['read', 'write', 'delete'],
    income: ['read', 'write'],
    marketing: ['read', 'write'],
    forecasting: ['read'], // Read-only
    reports: ['read', 'export'],
    settings: [], // No access
    team: ['read']
  },
  employee: {
    expenses: ['read', 'write'], // Own expenses only (enforced in Firestore rules)
    income: ['read'],
    marketing: [],
    forecasting: [],
    reports: ['read'], // Own reports only
    settings: [],
    team: []
  },
  accountant: {
    expenses: ['read', 'export'],
    income: ['read', 'export'],
    marketing: [],
    forecasting: ['read'],
    reports: ['read', 'export'],
    settings: [],
    team: []
  }
};

// Required subscription tiers for modules
const MODULE_TIERS = {
  expenses: 'lite',
  income: 'lite',
  marketing: 'business',
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
 * @param {string} role - User role (owner, manager, employee, accountant)
 * @param {string} module - Module name (expenses, income, marketing, etc.)
 * @param {string} action - Action (read, write, delete, export)
 * @returns {boolean} - True if user has permission
 */
export function hasPermission(role, module, action) {
  if (!role || !module || !action) return false;

  const rolePerms = ROLE_PERMISSIONS[role.toLowerCase()];
  if (!rolePerms) return false;

  const modulePerms = rolePerms[module.toLowerCase()];
  if (!modulePerms) return false;

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
  if (!role || !subscriptionTier || !module) return false;

  // Check if role has any permissions for this module
  const rolePerms = ROLE_PERMISSIONS[role.toLowerCase()];
  if (!rolePerms) return false;

  const modulePerms = rolePerms[module.toLowerCase()];
  if (!modulePerms || modulePerms.length === 0) return false;

  // Check subscription tier
  const requiredTier = MODULE_TIERS[module.toLowerCase()];
  if (!requiredTier) return true; // No tier requirement

  const userTierLevel = TIER_LEVELS[subscriptionTier.toLowerCase()] || 0;
  const requiredTierLevel = TIER_LEVELS[requiredTier.toLowerCase()] || 0;

  return userTierLevel >= requiredTierLevel;
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

