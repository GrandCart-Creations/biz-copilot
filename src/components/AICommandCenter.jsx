import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { authorizeAIScope, AI_SCOPES, getDefaultScopeForRole, canAccessScope } from '../utils/accessGateway';
import { logAIEvent } from '../utils/auditLog';
import { getCompanyNotifications } from '../firebase';
import { runExpirationChecks } from '../utils/expirationMonitor';
import { processAIQuery, formatAIResponse } from '../utils/aiEngine';
import { FaExclamationTriangle, FaClock, FaFileInvoice, FaCheckCircle } from 'react-icons/fa';

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
  const location = useLocation();
  const { currentUser } = useAuth();
  const { userRole, currentCompanyId, aiPolicies } = useCompany();
  const { shouldShowOnboarding } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState(() => getDefaultScopeForRole(userRole, aiPolicies));
  const [accessCode, setAccessCode] = useState('');
  const [status, setStatus] = useState({ 
    state: 'idle', 
    message: '', 
    data: null, 
    insights: [], 
    suggestions: [] 
  });
  const [urgentAlerts, setUrgentAlerts] = useState([]);
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
      
      // Load urgent alerts when opening
      if (currentCompanyId && currentUser && ['owner', 'manager'].includes(userRole)) {
        loadUrgentAlerts();
        // Run expiration checks when opening (if owner/manager)
        runExpirationChecks(currentCompanyId, currentUser.uid).then(() => {
          loadUrgentAlerts(); // Reload after checks
        });
      }
    }
  }, [isOpen, userRole, aiPolicies, currentCompanyId, currentUser]);

  const loadUrgentAlerts = async () => {
    if (!currentCompanyId || !currentUser) return;
    try {
      const notifications = await getCompanyNotifications(currentCompanyId, {
        userId: currentUser.uid,
        unreadOnly: true,
        limit: 10
      });
      
      // Filter for urgent/high priority notifications
      const urgent = notifications.filter(n => 
        !n.read && 
        (n.priority === 'urgent' || n.priority === 'high' || 
         ['contract_expiration', 'overdue_invoice', 'payment_due'].includes(n.type))
      );
      
      setUrgentAlerts(urgent);
    } catch (error) {
      console.error('Error loading urgent alerts:', error);
    }
  };

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

    try {
      // Process the query through AI Engine
      const response = await processAIQuery(
        query,
        scope,
        currentCompanyId,
        currentUser.uid
      );

      // Format the response
      const formattedResponse = formatAIResponse(response);

      // Log the query
      logAIEvent('executed', {
        query: query.slice(0, 200),
        scope,
        companyId: currentCompanyId,
        elevated: authorization.elevated || false
      });

      // Display the response with insights and suggestions
      let responseMessage = formattedResponse.text || 'Query processed successfully.';
      
      // Add insights if available
      if (formattedResponse.insights && formattedResponse.insights.length > 0) {
        const insightsText = formattedResponse.insights
          .map(insight => `\n\n💡 ${insight.message || insight}`)
          .join('');
        responseMessage += insightsText;
      }
      
      // Store full response for display
      setStatus({
        state: 'success',
        message: responseMessage,
        data: formattedResponse.data,
        insights: formattedResponse.insights,
        suggestions: formattedResponse.suggestions
      });
    } catch (error) {
      console.error('Error processing AI query:', error);
      logAIEvent('error', {
        query: query.slice(0, 200),
        scope,
        companyId: currentCompanyId,
        error: error.message
      });
      setStatus({
        state: 'error',
        message: `Error: ${error.message || 'Failed to process query. Please try again.'}`
      });
    }
  };

  const handleSuggestion = (suggestion) => {
    setScope(suggestion.scope);
    setQuery(suggestion.query);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (!currentUser) {
    return null;
  }

  // Hide "Ask Biz-CoPilot" button during onboarding (both company creator and team member onboarding)
  const isOnAcceptInvitationPage = location.pathname === '/accept-invitation';
  const isInOnboarding = shouldShowOnboarding || isOnAcceptInvitationPage;
  
  if (isInOnboarding) {
    return null;
  }

  // Check if sidebar is open (via data attribute set by MainLayout)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    const checkSidebar = () => {
      setSidebarOpen(document.body.hasAttribute('data-sidebar-open'));
    };
    
    // Check initially
    checkSidebar();
    
    // Watch for changes
    const observer = new MutationObserver(checkSidebar);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-sidebar-open']
    });
    
    return () => observer.disconnect();
  }, []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 px-4 py-2 rounded-full shadow-lg text-sm font-semibold text-white transition-all duration-300 ${
          sidebarOpen ? 'right-[280px]' : 'right-6'
        }`}
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
              {status.state !== 'idle' && status.state !== 'success' && (
                <span
                  className={`text-sm ${
                    status.state === 'loading'
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
        
        {/* AI Response Section */}
        {status.state === 'success' && status.message && (
          <div className="p-6 border-b border-gray-200 bg-gray-50 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {/* Main Response */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <FaCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-2">Response:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{status.message}</p>
                  </div>
                </div>
              </div>
              
              {/* Insights */}
              {status.insights && status.insights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Insights:</p>
                  {status.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        insight.type === 'warning'
                          ? 'bg-orange-50 border-orange-200 text-orange-800'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}
                    >
                      <p className="text-sm">{insight.message || insight}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Data Summary */}
              {status.data && status.data.totals && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Summary:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {status.data.totals.amount !== undefined && (
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          €{status.data.totals.amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {status.data.totals.count !== undefined && (
                      <div>
                        <span className="text-gray-600">Count:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {status.data.totals.count}
                        </span>
                      </div>
                    )}
                    {status.data.totals.vat !== undefined && (
                      <div>
                        <span className="text-gray-600">VAT:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          €{status.data.totals.vat.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {status.data.unpaidTotal !== undefined && (
                      <div>
                        <span className="text-gray-600">Unpaid:</span>
                        <span className="ml-2 font-semibold text-orange-600">
                          €{status.data.unpaidTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Suggestions */}
              {status.suggestions && status.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {status.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuery(suggestion);
                          setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Urgent Alerts Section */}
        {urgentAlerts.length > 0 && ['owner', 'manager'].includes(userRole) && (
          <div className="px-6 py-4 bg-red-50 border-y border-red-200">
            <div className="flex items-center gap-2 mb-3">
              <FaExclamationTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-semibold text-red-900">Urgent Actions Required</h3>
              <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                {urgentAlerts.length}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {urgentAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white border border-red-200 rounded-lg p-3 text-sm"
                >
                  <div className="flex items-start gap-2">
                    {alert.type === 'contract_expiration' && <FaFileInvoice className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />}
                    {alert.type === 'overdue_invoice' && <FaFileInvoice className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                    {alert.type === 'payment_due' && <FaClock className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{alert.title}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{alert.message}</p>
                      {alert.metadata?.daysUntilExpiry !== undefined && (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          {alert.metadata.daysUntilExpiry <= 0 
                            ? `Expired ${Math.abs(alert.metadata.daysUntilExpiry)} day${Math.abs(alert.metadata.daysUntilExpiry) !== 1 ? 's' : ''} ago`
                            : `${alert.metadata.daysUntilExpiry} day${alert.metadata.daysUntilExpiry !== 1 ? 's' : ''} remaining`}
                        </p>
                      )}
                      {alert.metadata?.daysOverdue !== undefined && (
                        <p className="text-xs text-red-600 mt-1 font-medium">
                          {alert.metadata.daysOverdue} day{alert.metadata.daysOverdue !== 1 ? 's' : ''} overdue
                        </p>
                      )}
                    </div>
                  </div>
                  {alert.actionUrl && (
                    <a
                      href={alert.actionUrl}
                      className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Take action →
                    </a>
                  )}
                </div>
              ))}
            </div>
            {urgentAlerts.length > 5 && (
              <p className="text-xs text-red-700 mt-2 text-center">
                +{urgentAlerts.length - 5} more urgent items. Check notifications →
              </p>
            )}
          </div>
        )}
        
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
