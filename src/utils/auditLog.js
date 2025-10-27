/**
 * AUDIT LOGGING SYSTEM
 * 
 * Tracks all important security and business events for compliance and monitoring.
 * Logs are stored in Firestore under /companies/{companyId}/auditLogs
 * 
 * Usage:
 * import { logAuditEvent } from '@/utils/auditLog';
 * await logAuditEvent('user.login', { email: user.email }, 'success');
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase.js';

// Audit event categories
export const AUDIT_CATEGORIES = {
  AUTH: 'auth',
  USER: 'user',
  DATA: 'data',
  SECURITY: 'security',
  FINANCIAL: 'financial',
  SYSTEM: 'system',
};

// Audit event types
export const AUDIT_EVENTS = {
  // Authentication events
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  PASSWORD_CHANGE: 'user.password.change',
  PASSWORD_RESET: 'user.password.reset',
  MFA_ENABLED: 'user.mfa.enabled',
  MFA_DISABLED: 'user.mfa.disabled',
  
  // User management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  ROLE_CHANGED: 'user.role.changed',
  PERMISSION_CHANGED: 'user.permission.changed',
  
  // Data operations
  EXPENSE_CREATED: 'data.expense.created',
  EXPENSE_UPDATED: 'data.expense.updated',
  EXPENSE_DELETED: 'data.expense.deleted',
  INCOME_CREATED: 'data.income.created',
  INCOME_UPDATED: 'data.income.updated',
  INCOME_DELETED: 'data.income.deleted',
  INVOICE_CREATED: 'data.invoice.created',
  INVOICE_SENT: 'data.invoice.sent',
  INVOICE_PAID: 'data.invoice.paid',
  
  // Security events
  FAILED_LOGIN: 'security.login.failed',
  ACCOUNT_LOCKED: 'security.account.locked',
  SUSPICIOUS_ACTIVITY: 'security.suspicious.activity',
  DATA_EXPORT: 'security.data.export',
  DATA_IMPORT: 'security.data.import',
  
  // Financial events
  PAYMENT_PROCESSED: 'financial.payment.processed',
  REFUND_ISSUED: 'financial.refund.issued',
  PAYROLL_RUN: 'financial.payroll.run',
};

/**
 * Log an audit event
 * @param {string} eventType - Type of event (use AUDIT_EVENTS constants)
 * @param {object} details - Additional details about the event
 * @param {string} status - Event status: 'success', 'failure', 'warning'
 * @param {string} companyId - Company ID (optional, auto-detected if in context)
 * @param {string} userId - User ID (optional, auto-detected if in context)
 */
export const logAuditEvent = async (
  eventType, 
  details = {}, 
  status = 'success',
  companyId = null,
  userId = null
) => {
  try {
    // Determine category from event type
    const category = eventType.split('.')[0];
    
    // Get user info if not provided
    const currentUser = userId || getCurrentUserId();
    const currentCompany = companyId || getCurrentCompanyId();
    
    // Prepare audit log entry
    const auditLog = {
      eventType,
      category,
      status,
      details: sanitizeDetails(details),
      userId: currentUser,
      companyId: currentCompany,
      timestamp: serverTimestamp(),
      ipAddress: await getClientIP(),
      userAgent: navigator.userAgent,
      // Add session ID for tracking user sessions
      sessionId: getSessionId(),
    };
    
    // Store log in Firestore
    if (currentCompany) {
      await addDoc(
        collection(db, `companies/${currentCompany}/auditLogs`),
        auditLog
      );
    } else {
      // For events without company context (e.g., registration)
      await addDoc(collection(db, 'globalAuditLogs'), auditLog);
    }
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Audit Log:', auditLog);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should never break the app
    return false;
  }
};

// Helper: Get current user ID from auth context
const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.uid || null;
    }
    return null;
  } catch {
    return null;
  }
};

// Helper: Get current company ID from context
const getCurrentCompanyId = () => {
  try {
    const companyStr = localStorage.getItem('selectedCompany');
    if (companyStr) {
      const company = JSON.parse(companyStr);
      return company.id || null;
    }
    return null;
  } catch {
    return null;
  }
};

// Helper: Get session ID (create if doesn't exist)
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// Helper: Sanitize sensitive details before logging
const sanitizeDetails = (details) => {
  const sanitized = { ...details };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'cardNumber', 'cvv', 'ssn', 'apiKey', 'token'];
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

// Helper: Get client IP address (best effort)
const getClientIP = async () => {
  try {
    // In production, this should use your backend API
    // For now, return placeholder
    return 'client-side';
  } catch {
    return 'unknown';
  }
};

// Convenience functions for common audit events

export const logLogin = (email, success = true) => {
  return logAuditEvent(
    success ? AUDIT_EVENTS.USER_LOGIN : AUDIT_EVENTS.FAILED_LOGIN,
    { email },
    success ? 'success' : 'failure'
  );
};

export const logLogout = (email) => {
  return logAuditEvent(AUDIT_EVENTS.USER_LOGOUT, { email }, 'success');
};

export const logDataChange = (type, action, data) => {
  const eventType = `data.${type}.${action}`;
  return logAuditEvent(eventType, data, 'success');
};

export const logSecurityEvent = (eventType, details) => {
  return logAuditEvent(eventType, details, 'warning');
};

export const logFinancialEvent = (eventType, amount, details = {}) => {
  return logAuditEvent(eventType, { amount, ...details }, 'success');
};
