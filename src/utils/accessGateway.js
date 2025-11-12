import { logAIEvent } from './auditLog';

export const AI_SCOPES = {
  GLOBAL: 'global',
  FINANCIAL: 'financial',
  HR: 'hr',
  OWNER: 'owner'
};

export const DEFAULT_AI_POLICIES = {
  roleScopes: {
    owner: [AI_SCOPES.GLOBAL, AI_SCOPES.FINANCIAL, AI_SCOPES.HR, AI_SCOPES.OWNER],
    manager: [AI_SCOPES.GLOBAL, AI_SCOPES.FINANCIAL, AI_SCOPES.HR],
    employee: [AI_SCOPES.GLOBAL],
    contractor: [AI_SCOPES.GLOBAL]
  },
  requireCodeFor: [AI_SCOPES.OWNER]
};

const resolveRoleScopes = (policies) => {
  const roleScopes = policies?.roleScopes || {};
  return {
    ...DEFAULT_AI_POLICIES.roleScopes,
    ...Object.keys(roleScopes).reduce((acc, key) => {
      const normalized = key?.toLowerCase?.();
      if (!normalized) return acc;
      acc[normalized] = roleScopes[key];
      return acc;
    }, {})
  };
};

const getRoleScopesFor = (role, policies) => {
  const normalized = role?.toLowerCase?.() || 'employee';
  const resolved = resolveRoleScopes(policies);
  return resolved[normalized] || resolved.employee;
};

export const getDefaultScopeForRole = (role = 'employee', policies) => {
  const scopes = getRoleScopesFor(role, policies);
  return scopes[0] || AI_SCOPES.GLOBAL;
};

export const canAccessScope = (role = 'employee', scope = AI_SCOPES.GLOBAL, policies) => {
  const permitted = getRoleScopesFor(role, policies);
  return permitted.includes(scope);
};

export const validateAccessCode = (code) => {
  if (!code) return false;
  const trimmed = code.trim();
  if (trimmed.length < 4) return false;
  if (/owner|master|admin/i.test(trimmed)) return true;
  return trimmed.length >= 8;
};

export const authorizeAIScope = ({ role, scope, accessCode, query, policies }) => {
  const effectivePolicies = policies || DEFAULT_AI_POLICIES;
  const requiresCode = effectivePolicies.requireCodeFor?.includes?.(scope);
  const hasScope = canAccessScope(role, scope, effectivePolicies);

  if (hasScope && !requiresCode) {
    return { allowed: true };
  }

  if (requiresCode && !validateAccessCode(accessCode)) {
    logAIEvent('blocked', { scope, query: query?.slice(0, 160), reason: 'code-required' });
    return { allowed: false, reason: 'Access code required for this scope.' };
  }

  if (!hasScope) {
    if (validateAccessCode(accessCode)) {
      logAIEvent('granted-via-code', { scope, query: query?.slice(0, 160) });
      return { allowed: true, elevated: true };
    }
    logAIEvent('blocked', { scope, query: query?.slice(0, 160), reason: 'role-restriction' });
    return { allowed: false, reason: 'Insufficient permissions for requested scope.' };
  }

  logAIEvent('granted-via-code', { scope, query: query?.slice(0, 160), reason: 'required-code' });
  return { allowed: true, elevated: true };
};
