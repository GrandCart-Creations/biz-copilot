import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AI_SCOPES, DEFAULT_AI_POLICIES } from './accessGateway';

const AI_POLICIES_DOC = 'aiPolicies';

export const getCompanyAIPolicies = async (companyId) => {
  if (!companyId) return DEFAULT_AI_POLICIES;
  try {
    const policyRef = doc(db, 'companies', companyId, 'settings', AI_POLICIES_DOC);
    const snapshot = await getDoc(policyRef);
    if (!snapshot.exists()) {
      return DEFAULT_AI_POLICIES;
    }
    const data = snapshot.data();
    return {
      ...DEFAULT_AI_POLICIES,
      ...data,
      roleScopes: {
        ...DEFAULT_AI_POLICIES.roleScopes,
        ...(data.roleScopes || {})
      },
      requireCodeFor: data.requireCodeFor || DEFAULT_AI_POLICIES.requireCodeFor
    };
  } catch (error) {
    console.error('Error fetching AI policies:', error);
    return DEFAULT_AI_POLICIES;
  }
};

export const saveCompanyAIPolicies = async (companyId, policies = DEFAULT_AI_POLICIES, userId = null) => {
  if (!companyId) throw new Error('companyId is required to save AI policies');
  try {
    const policyRef = doc(db, 'companies', companyId, 'settings', AI_POLICIES_DOC);
    const payload = {
      ...policies,
      updatedAt: new Date().toISOString(),
      updatedBy: userId || 'system'
    };
    // Ensure arrays clean
    payload.requireCodeFor = Array.from(new Set(payload.requireCodeFor || [])).filter(Boolean);
    payload.roleScopes = Object.keys(policies.roleScopes || {}).reduce((acc, key) => {
      const normalized = key.toLowerCase();
      acc[normalized] = policies.roleScopes[key];
      return acc;
    }, {});
    await setDoc(policyRef, payload, { merge: true });
    return payload;
  } catch (error) {
    console.error('Error saving AI policies:', error);
    throw error;
  }
};

export const ensureOwnerScopePresent = (policies = DEFAULT_AI_POLICIES) => {
  const next = { ...policies };
  if (!next.roleScopes?.owner?.includes(AI_SCOPES.OWNER)) {
    next.roleScopes = {
      ...next.roleScopes,
      owner: Array.from(new Set([...(next.roleScopes?.owner || []), AI_SCOPES.OWNER]))
    };
  }
  return next;
};
