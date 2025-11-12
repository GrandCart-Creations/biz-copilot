import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { authorizeAIScope, AI_SCOPES, getDefaultScopeForRole, canAccessScope } from '../utils/accessGateway';
import { logAIEvent } from '../utils/auditLog';

const SUGGESTION_PRESETS = [
  {
    label: 'Find unreconciled expenses this month',
    scope: AI_SCOPES.FINANCIAL,
    query: 'Show unreconciled expenses for this month'
  },
  {
    label: 'Summarize HR onboarding status',
    scope: AI_SCOPES.HR,
    query: 'Summarize HR onboarding status for all team members'
  },
  {
    label: 'What changed this week?',
    scope: AI_SCOPES.GLOBAL,
    query: 'What key activities happened this week?'
  }
];

const AICommandCenter = () => {
  const { currentUser } = useAuth();
  const { userRole, currentCompanyId, aiPolicies } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState(() => getDefaultScopeForRole(userRole, aiPolicies));
  const [accessCode, setAccessCode] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
          return next;
        });
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setAccessCode('');
      setStatus({ state: 'idle', message: '' });
      setScope(getDefaultScopeForRole(userRole, aiPolicies));
    }
  }, [isOpen, userRole, aiPolicies]);

  const scopeOptions = useMemo(() => {
    const requiresCodeSet = new Set(aiPolicies?.requireCodeFor || []);
    const base = [
      { value: AI_SCOPES.GLOBAL, label: 'Workspace (global)' },
      { value: AI_SCOPES.FINANCIAL, label: 'Financial data' },
      { value: AI_SCOPES.HR, label: 'People & HR' },
      {
        value: AI_SCOPES.OWNER,
        label: `Owner-only insights${requiresCodeSet.has(AI_SCOPES.OWNER) ? ' (code)' : ''}`
      }
    ];
    return base.filter((option) => {
      const hasRoleAccess = canAccessScope(userRole, option.value, aiPolicies);
      const requiresCode = requiresCodeSet.has(option.value);
      return hasRoleAccess || requiresCode;
    });
  }, [userRole, aiPolicies]);

  const runQuery = async (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setStatus({ state: 'error', message: 'Ask a question or choose a suggestion.' });
      return;
    }
    if (!currentCompanyId || !currentUser) {
      setStatus({ state: 'error', message: 'Select a company to run AI commands.' });
      return;
    }

    const authorization = authorizeAIScope({ role: userRole, scope, accessCode, query, policies: aiPolicies });
    if (!authorization.allowed) {
      setStatus({ state: 'error', message: authorization.reason || 'Access denied for this scope.' });
      return;
    }

    setStatus({ state: 'loading', message: 'Thinking…' });

    setTimeout(() => {
      logAIEvent('executed', {
        query: query.slice(0, 200),
        scope,
        companyId: currentCompanyId,
        elevated: authorization.elevated || false
      });
      setStatus({
        state: 'success',
        message: 'AI response placeholder — integration coming in Phase 7.0.'
      });
    }, 500);
  };

  const handleSuggestion = (suggestion) => {
    setScope(suggestion.scope);
    setQuery(suggestion.query);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (!currentUser) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 px-4 py-2 rounded-full shadow-lg text-sm font-semibold text-white"
        style={{ backgroundColor: '#005C70' }}
        title="Open AI Command Center (⌘K / Ctrl+K)"
      >
        ✨ Ask Biz-CoPilot
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-xl">
        <form onSubmit={runQuery} className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#005C70] bg-[#00BFA6]/10 rounded">
              AI Command Center
            </span>
            <span className="text-xs text-gray-500">Press Esc to close</span>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Ask anything about your workspace
              </label>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40"
                placeholder="e.g. Compare this month’s expenses to last month"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Data scope
                </label>
                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40"
                >
                  {scopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Access code (owners / managers)
                </label>
                <input
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40"
                  placeholder="Optional override code"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#005C70' }}
                disabled={status.state === 'loading'}
              >
                {status.state === 'loading' ? 'Processing…' : 'Run command'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800"
              >
                Close
              </button>
              {status.state !== 'idle' && (
                <span
                  className={`text-sm ${
                    status.state === 'success'
                      ? 'text-green-600'
                      : status.state === 'loading'
                        ? 'text-blue-600'
                        : 'text-red-600'
                  }`}
                >
                  {status.message}
                </span>
              )}
            </div>
          </div>
        </form>
        <div className="p-6 grid gap-3 sm:grid-cols-3">
          {SUGGESTION_PRESETS.map((preset) => (
            <button
              key={preset.query}
              type="button"
              onClick={() => handleSuggestion(preset)}
              className="text-left border border-gray-200 rounded-lg px-3 py-3 hover:border-[#00BFA6] hover:bg-[#00BFA6]/5 transition"
            >
              <p className="text-sm font-semibold text-gray-800">{preset.label}</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Scope: {preset.scope}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AICommandCenter;
