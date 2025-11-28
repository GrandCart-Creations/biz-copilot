import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useButtonVisibility } from '../contexts/ButtonVisibilityContext';
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

const AICommandCenter = ({ minimized = false, onMinimizedClick }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { userRole, currentCompanyId, aiPolicies } = useCompany();
  const { shouldShowOnboarding } = useOnboarding();
  const { showFloatingButtons } = useButtonVisibility();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      // Clear query immediately
      setQuery('');
      setAccessCode('');
      setStatus({ state: 'idle', message: '' });
      setScope(getDefaultScopeForRole(userRole, aiPolicies));
      
      // Force clear input field after a brief delay to override browser autofill
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.value = '';
          setQuery('');
          // Blur and refocus to clear any browser autofill
          inputRef.current.blur();
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      }, 100);
      
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

  // Check if sidebar is open (via data attribute set by MainLayout)
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

  // Listen for header button clicks (must be before early returns)
  useEffect(() => {
    const handleHeaderClick = () => {
      setIsOpen(true);
    };
    window.addEventListener('ai-click', handleHeaderClick);
    return () => window.removeEventListener('ai-click', handleHeaderClick);
  }, []);

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
      
      // Enhanced error messages with helpful suggestions
      let errorMessage = 'Failed to process your query.';
      let errorSuggestion = '';
      
      if (error.message) {
        const lowerError = error.message.toLowerCase();
        
        if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
          errorMessage = 'Connection error: Unable to reach the AI service.';
          errorSuggestion = 'Please check your internet connection and try again.';
        } else if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
          errorMessage = 'Request timeout: The query took too long to process.';
          errorSuggestion = 'Please try rephrasing your question or breaking it into smaller parts.';
        } else if (lowerError.includes('permission') || lowerError.includes('unauthorized')) {
          errorMessage = 'Permission error: You may not have access to this data scope.';
          errorSuggestion = 'Try selecting a different data scope or contact your administrator.';
        } else if (lowerError.includes('quota') || lowerError.includes('limit') || lowerError.includes('rate')) {
          errorMessage = 'Service limit reached: Too many requests.';
          errorSuggestion = 'Please wait a moment and try again.';
        } else if (lowerError.includes('api') || lowerError.includes('openai')) {
          errorMessage = 'AI service error: The AI service encountered an issue.';
          errorSuggestion = 'Please try again in a moment. If the problem persists, contact support.';
        } else {
          errorMessage = `Error: ${error.message}`;
          errorSuggestion = 'Please try rephrasing your question or try again later.';
        }
      }
      
      setStatus({
        state: 'error',
        message: errorMessage,
        suggestion: errorSuggestion
      });
    }
  };

  const handleSuggestion = (suggestion) => {
    setScope(suggestion.scope);
    setQuery(suggestion.query);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Early returns after all hooks
  if (!currentUser) {
    return null;
  }

  // Hide "Ask Biz-CoPilot" button during onboarding (both company creator and team member onboarding)
  const isOnAcceptInvitationPage = location.pathname === '/accept-invitation';
  const isInOnboarding = shouldShowOnboarding || isOnAcceptInvitationPage;
  
  if (isInOnboarding) {
    return null;
  }

  const handleClick = () => {
    setIsOpen(true);
  };

  // Don't render floating button if minimized or visibility is false
  if (!isOpen && (minimized || !showFloatingButtons)) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`fixed bottom-6 px-4 py-2 rounded-full shadow-lg text-sm font-semibold text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40 ${
          sidebarOpen ? 'right-[280px]' : 'right-6'
        }`}
        style={{ backgroundColor: '#005C70' }}
        title="Open AI Command Center (⌘K / Ctrl+K)"
        aria-label="Open AI Command Center"
      >
        ✨ Ask Biz-CoPilot
      </button>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-command-center-title"
    >
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-xl">
        <form onSubmit={runQuery} className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <span 
              id="ai-command-center-title"
              className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#005C70] bg-[#00BFA6]/10 rounded"
            >
              AI Command Center
            </span>
            <span className="text-xs text-gray-500">Press Esc to close</span>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="ai-query-input" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Ask anything about your workspace
              </label>
              <input
                id="ai-query-input"
                ref={inputRef}
                type="text"
                name="ai-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40"
                placeholder="e.g. Compare this month's expenses to last month"
                aria-label="AI query input"
                aria-describedby="query-help"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-lpignore="true"
                data-form-type="other"
              />
              <p id="query-help" className="sr-only">Enter a natural language question about your business data</p>
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
                  aria-label="Data scope selection"
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
                  aria-label="Access code for elevated permissions"
                  type="password"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40"
                style={{ backgroundColor: '#005C70' }}
                disabled={status.state === 'loading'}
                aria-label={status.state === 'loading' ? 'Processing query' : 'Run AI query'}
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
                <div className="flex flex-col gap-1">
                  <span
                    className={`text-sm ${
                      status.state === 'loading'
                        ? 'text-blue-600'
                        : 'text-red-600'
                    }`}
                  >
                    {status.message}
                  </span>
                  {status.suggestion && (
                    <span className="text-xs text-gray-600 italic">
                      {status.suggestion}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
        
        {/* Error Display Section */}
        {status.state === 'error' && status.message && (
          <div className="p-6 border-b border-gray-200 bg-red-50">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 mb-1">Error</p>
                <p className="text-sm text-red-800 mb-2">{status.message}</p>
                {status.suggestion && (
                  <p className="text-xs text-red-700 italic bg-red-100 rounded px-2 py-1.5 border border-red-200">
                    💡 {status.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
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
