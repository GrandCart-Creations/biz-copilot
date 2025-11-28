/**
 * SIDEBAR PREFERENCES UTILITY
 * 
 * Manages user preferences for sidebar menu item ordering
 * Stores preferences in localStorage (per user/company)
 */

const STORAGE_KEY_PREFIX = 'sidebar_order_';

/**
 * Get storage key for current user/company
 */
const getStorageKey = (userId, companyId) => {
  return `${STORAGE_KEY_PREFIX}${userId}_${companyId || 'default'}`;
};

/**
 * Get default module order for a section
 * @param {string} sectionId - Section ID (financial, operations, administration)
 * @returns {Array} Default module IDs in order
 */
export const getDefaultSectionOrder = (sectionId) => {
  const defaultOrders = {
    financial: ['expenses', 'income', 'invoices', 'financialDashboard', 'reports'],
    operations: ['marketing', 'projects', 'forecasting'],
    administration: ['settings', 'team', 'security']
  };
  return defaultOrders[sectionId] || [];
};

/**
 * Get custom order for a section
 * @param {string} sectionId - Section ID
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 * @returns {Array} Custom module IDs in order, or default if not set
 */
export const getSectionOrder = (sectionId, userId, companyId) => {
  if (!userId) return getDefaultSectionOrder(sectionId);
  
  try {
    const storageKey = getStorageKey(userId, companyId);
    const saved = localStorage.getItem(storageKey);
    if (!saved) return getDefaultSectionOrder(sectionId);
    
    const preferences = JSON.parse(saved);
    const customOrder = preferences[sectionId];
    
    if (Array.isArray(customOrder) && customOrder.length > 0) {
      return customOrder;
    }
  } catch (error) {
    console.error('Error loading sidebar preferences:', error);
  }
  
  return getDefaultSectionOrder(sectionId);
};

/**
 * Save custom order for a section
 * @param {string} sectionId - Section ID
 * @param {Array} moduleIds - Module IDs in desired order
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 */
export const saveSectionOrder = (sectionId, moduleIds, userId, companyId) => {
  if (!userId) return;
  
  try {
    const storageKey = getStorageKey(userId, companyId);
    const existing = localStorage.getItem(storageKey);
    const preferences = existing ? JSON.parse(existing) : {};
    
    preferences[sectionId] = moduleIds;
    
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving sidebar preferences:', error);
  }
};

/**
 * Reset section order to default
 * @param {string} sectionId - Section ID
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 */
export const resetSectionOrder = (sectionId, userId, companyId) => {
  if (!userId) return;
  
  try {
    const storageKey = getStorageKey(userId, companyId);
    const existing = localStorage.getItem(storageKey);
    if (!existing) return;
    
    const preferences = JSON.parse(existing);
    delete preferences[sectionId];
    
    if (Object.keys(preferences).length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    }
  } catch (error) {
    console.error('Error resetting sidebar preferences:', error);
  }
};

/**
 * Reorder modules within a section
 * @param {string} sectionId - Section ID
 * @param {string} moduleId - Module ID to move
 * @param {number} direction - 1 for down, -1 for up
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 * @returns {Array} New order
 */
export const reorderModule = (sectionId, moduleId, direction, userId, companyId) => {
  const currentOrder = getSectionOrder(sectionId, userId, companyId);
  const index = currentOrder.indexOf(moduleId);
  
  if (index === -1) return currentOrder;
  if ((direction === -1 && index === 0) || (direction === 1 && index === currentOrder.length - 1)) {
    return currentOrder; // Can't move further
  }
  
  const newOrder = [...currentOrder];
  const newIndex = index + direction;
  [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
  
  saveSectionOrder(sectionId, newOrder, userId, companyId);
  return newOrder;
};

