/**
 * INTER-DEPARTMENT COLLABORATION SYSTEM
 * 
 * Industry-leading collaboration framework for Biz-CoPilot
 * Enables secure, granular data sharing between departments
 * 
 * Features:
 * - Granular access control (read-only, read-write, comment-only)
 * - Cross-department data visibility
 * - Real-time activity feeds
 * - Shared workspaces
 * - Feedback routing
 * - Timeline synchronization
 * - Campaign-project alignment
 */

/**
 * Department definitions
 */
export const DEPARTMENTS = {
  MARKETING: 'marketing',
  PROJECTS: 'projects',
  FINANCIAL: 'financial',
  OPERATIONS: 'operations',
  SALES: 'sales',
  SUPPORT: 'support',
  DEVELOPMENT: 'development'
};

/**
 * Data sharing levels
 */
export const SHARING_LEVELS = {
  NONE: 'none',              // No access
  VIEW_ONLY: 'view_only',   // Can view but not edit
  COMMENT: 'comment',        // Can view and comment
  READ_WRITE: 'read_write',  // Full read/write access
  FULL: 'full'               // Full access including delete
};

/**
 * Data types that can be shared
 */
export const SHARABLE_DATA_TYPES = {
  PROJECT_DETAILS: 'project_details',
  PROJECT_TIMELINE: 'project_timeline',
  BUILD_TIMELINE: 'build_timeline',
  TESTING_DATA: 'testing_data',
  ROLLOUT_STRATEGY: 'rollout_strategy',
  ROLLOUT_PLAN: 'rollout_plan',
  USER_FEEDBACK: 'user_feedback',
  PERFORMANCE_METRICS: 'performance_metrics',
  CAMPAIGN_STRATEGY: 'campaign_strategy',
  CAMPAIGN_PERFORMANCE: 'campaign_performance',
  BUDGET: 'budget',
  FINANCIAL_DATA: 'financial_data',
  CUSTOMER_DATA: 'customer_data',
  PRODUCT_ROADMAP: 'product_roadmap',
  RELEASE_NOTES: 'release_notes',
  BUG_REPORTS: 'bug_reports',
  FEATURE_REQUESTS: 'feature_requests'
};

/**
 * Default sharing configurations per department pair
 */
export const DEFAULT_SHARING_CONFIG = {
  // Marketing ↔ Projects
  [`${DEPARTMENTS.MARKETING}-${DEPARTMENTS.PROJECTS}`]: {
    [SHARABLE_DATA_TYPES.PROJECT_DETAILS]: SHARING_LEVELS.VIEW_ONLY,
    [SHARABLE_DATA_TYPES.PROJECT_TIMELINE]: SHARING_LEVELS.VIEW_ONLY,
    [SHARABLE_DATA_TYPES.BUILD_TIMELINE]: SHARING_LEVELS.VIEW_ONLY,
    [SHARABLE_DATA_TYPES.TESTING_DATA]: SHARING_LEVELS.COMMENT,
    [SHARABLE_DATA_TYPES.ROLLOUT_STRATEGY]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.ROLLOUT_PLAN]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.USER_FEEDBACK]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.PERFORMANCE_METRICS]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.CAMPAIGN_STRATEGY]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.CAMPAIGN_PERFORMANCE]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.PRODUCT_ROADMAP]: SHARING_LEVELS.VIEW_ONLY,
    [SHARABLE_DATA_TYPES.RELEASE_NOTES]: SHARING_LEVELS.VIEW_ONLY,
    [SHARABLE_DATA_TYPES.BUG_REPORTS]: SHARING_LEVELS.COMMENT,
    [SHARABLE_DATA_TYPES.FEATURE_REQUESTS]: SHARING_LEVELS.COMMENT
  },
  
  // Projects ↔ Financial
  [`${DEPARTMENTS.PROJECTS}-${DEPARTMENTS.FINANCIAL}`]: {
    [SHARABLE_DATA_TYPES.BUDGET]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.PROJECT_DETAILS]: SHARING_LEVELS.VIEW_ONLY,
    [SHARABLE_DATA_TYPES.PROJECT_TIMELINE]: SHARING_LEVELS.VIEW_ONLY
  },
  
  // Marketing ↔ Financial
  [`${DEPARTMENTS.MARKETING}-${DEPARTMENTS.FINANCIAL}`]: {
    [SHARABLE_DATA_TYPES.BUDGET]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.CAMPAIGN_PERFORMANCE]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.FINANCIAL_DATA]: SHARING_LEVELS.VIEW_ONLY
  },
  
  // Support ↔ Projects
  [`${DEPARTMENTS.SUPPORT}-${DEPARTMENTS.PROJECTS}`]: {
    [SHARABLE_DATA_TYPES.USER_FEEDBACK]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.BUG_REPORTS]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.FEATURE_REQUESTS]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.PROJECT_DETAILS]: SHARING_LEVELS.VIEW_ONLY
  },
  
  // Sales ↔ Marketing
  [`${DEPARTMENTS.SALES}-${DEPARTMENTS.MARKETING}`]: {
    [SHARABLE_DATA_TYPES.CAMPAIGN_STRATEGY]: SHARING_LEVELS.VIEW_ONLY,
    [SHARABLE_DATA_TYPES.CAMPAIGN_PERFORMANCE]: SHARING_LEVELS.READ_WRITE,
    [SHARABLE_DATA_TYPES.CUSTOMER_DATA]: SHARING_LEVELS.READ_WRITE
  }
};

/**
 * Get sharing configuration for two departments
 */
export function getSharingConfig(sourceDept, targetDept) {
  const key1 = `${sourceDept}-${targetDept}`;
  const key2 = `${targetDept}-${sourceDept}`;
  
  return DEFAULT_SHARING_CONFIG[key1] || DEFAULT_SHARING_CONFIG[key2] || {};
}

/**
 * Check if a department can access specific data type
 */
export function canAccessDataType(sourceDept, targetDept, dataType) {
  const config = getSharingConfig(sourceDept, targetDept);
  const level = config[dataType];
  return level && level !== SHARING_LEVELS.NONE;
}

/**
 * Get access level for a data type
 */
export function getAccessLevel(sourceDept, targetDept, dataType) {
  const config = getSharingConfig(sourceDept, targetDept);
  return config[dataType] || SHARING_LEVELS.NONE;
}

/**
 * Check if user can write to shared data
 */
export function canWriteSharedData(sourceDept, targetDept, dataType) {
  const level = getAccessLevel(sourceDept, targetDept, dataType);
  return level === SHARING_LEVELS.READ_WRITE || level === SHARING_LEVELS.FULL;
}

/**
 * Check if user can comment on shared data
 */
export function canCommentSharedData(sourceDept, targetDept, dataType) {
  const level = getAccessLevel(sourceDept, targetDept, dataType);
  return level === SHARING_LEVELS.COMMENT || 
         level === SHARING_LEVELS.READ_WRITE || 
         level === SHARING_LEVELS.FULL;
}

/**
 * Activity types for cross-department notifications
 */
export const ACTIVITY_TYPES = {
  PROJECT_UPDATED: 'project_updated',
  TIMELINE_CHANGED: 'timeline_changed',
  ROLLOUT_STRATEGY_UPDATED: 'rollout_strategy_updated',
  USER_FEEDBACK_RECEIVED: 'user_feedback_received',
  CAMPAIGN_LAUNCHED: 'campaign_launched',
  CAMPAIGN_PERFORMANCE_UPDATE: 'campaign_performance_update',
  BUG_REPORTED: 'bug_reported',
  FEATURE_REQUESTED: 'feature_requested',
  TESTING_COMPLETE: 'testing_complete',
  RELEASE_ANNOUNCED: 'release_announced',
  BUDGET_UPDATED: 'budget_updated',
  MILESTONE_REACHED: 'milestone_reached'
};

/**
 * Get departments that should be notified for an activity
 */
export function getNotifiedDepartments(activityType, sourceDepartment) {
  const notificationMap = {
    [ACTIVITY_TYPES.PROJECT_UPDATED]: [DEPARTMENTS.MARKETING, DEPARTMENTS.FINANCIAL],
    [ACTIVITY_TYPES.TIMELINE_CHANGED]: [DEPARTMENTS.MARKETING, DEPARTMENTS.FINANCIAL],
    [ACTIVITY_TYPES.ROLLOUT_STRATEGY_UPDATED]: [DEPARTMENTS.MARKETING],
    [ACTIVITY_TYPES.USER_FEEDBACK_RECEIVED]: [DEPARTMENTS.MARKETING, DEPARTMENTS.PROJECTS, DEPARTMENTS.SUPPORT],
    [ACTIVITY_TYPES.CAMPAIGN_LAUNCHED]: [DEPARTMENTS.PROJECTS, DEPARTMENTS.FINANCIAL],
    [ACTIVITY_TYPES.CAMPAIGN_PERFORMANCE_UPDATE]: [DEPARTMENTS.PROJECTS, DEPARTMENTS.FINANCIAL],
    [ACTIVITY_TYPES.BUG_REPORTED]: [DEPARTMENTS.PROJECTS, DEPARTMENTS.SUPPORT],
    [ACTIVITY_TYPES.FEATURE_REQUESTED]: [DEPARTMENTS.PROJECTS, DEPARTMENTS.MARKETING],
    [ACTIVITY_TYPES.TESTING_COMPLETE]: [DEPARTMENTS.MARKETING],
    [ACTIVITY_TYPES.RELEASE_ANNOUNCED]: [DEPARTMENTS.MARKETING, DEPARTMENTS.SUPPORT],
    [ACTIVITY_TYPES.BUDGET_UPDATED]: [DEPARTMENTS.PROJECTS, DEPARTMENTS.MARKETING],
    [ACTIVITY_TYPES.MILESTONE_REACHED]: [DEPARTMENTS.MARKETING, DEPARTMENTS.FINANCIAL]
  };
  
  return notificationMap[activityType] || [];
}

/**
 * Collaboration workspace types
 */
export const WORKSPACE_TYPES = {
  PROJECT_LAUNCH: 'project_launch',           // Marketing + Projects collaboration
  PRODUCT_ROLLOUT: 'product_rollout',         // Multi-department rollout planning
  CAMPAIGN_EXECUTION: 'campaign_execution',   // Marketing campaign with project alignment
  FEEDBACK_ANALYSIS: 'feedback_analysis',     // User feedback review across departments
  BUDGET_PLANNING: 'budget_planning',         // Financial planning with departments
  STRATEGIC_PLANNING: 'strategic_planning'    // High-level cross-department planning
};

export default {
  DEPARTMENTS,
  SHARING_LEVELS,
  SHARABLE_DATA_TYPES,
  DEFAULT_SHARING_CONFIG,
  ACTIVITY_TYPES,
  WORKSPACE_TYPES,
  getSharingConfig,
  canAccessDataType,
  getAccessLevel,
  canWriteSharedData,
  canCommentSharedData,
  getNotifiedDepartments
};

