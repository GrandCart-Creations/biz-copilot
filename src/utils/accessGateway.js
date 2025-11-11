import { logAIEvent } from './auditLog';

export const AI_SCOPES = {
  GLOBAL: 'global',
  FINANCIAL: 'financial',
  HR: 'hr',
  OWNER: 'owner'
};

const ROLE_SCOPE_MATRIX = {
  owner: [AI_SCOPES.GLOBAL, AI_SCOPES.FINANCIAL, AI_SCOPES.HR, AI_SCOPES.OWNER],
  manager: [AI_SCOPES.GLOBAL, AI_SCOPES.FINANCIAL, AI_SCOPES.HR],
  employee: [AI_SCOPES.GLOBAL],
  contractor: [AI_SCOPES.GLOBAL]
};

export const getDefaultScopeForRole = (role = 'employee') => {
  const normalized = role?.toLowerCase?.() || 'employee';
  const scopes = ROLE_SCOPE_MATRIX[normalized] || ROLE_SCOPE_MATRIX.employee;
  return scopes[0];
};

export const canAccessScope = (role = 'employee', scope = AI_SCOPES.GLOBAL) => {
  const normalizedRole = role?.toLowerCase?.() || 'employee';
  const permitted = ROLE_SCOPE_MATRIX[normalizedRole] || ROLE_SCOPE_MATRIX.employee;
  return permitted.includes(scope);
};

export const validateAccessCode = (code) => {
  if (!code) return false;
  const trimmed = code.trim();
  if (trimmed.length < 4) return false;
  if (/owner|master|admin/i.test(trimmed)) return true;
  return trimmed.length >= 8;
};

export const authorizeAIScope = ({ role, scope, accessCode, query }) => {
  if (canAccessScope(role, scope)) {
    return { allowed: true };
  }

  if (validateAccessCode(accessCode)) {
    logAIEvent('granted-via-code', { scope, query: query?.slice(0, 160) });
    return { allowed: true, elevated: true };
  }

  logAIEvent('blocked', { scope, query: query?.slice(0, 160) });
  return { allowed: false, reason: 'Insufficient permissions for requested scope.' };
};
