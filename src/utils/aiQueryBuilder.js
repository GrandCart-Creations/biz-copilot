/**
 * AI QUERY BUILDER
 * 
 * Converts natural language queries into Firestore queries
 * Handles data aggregation, filtering, and sorting
 */

/**
 * Build a Firestore query from natural language intent
 * @param {string} intent - Query intent (data_query, comparison, analytics, etc.)
 * @param {string} scope - Data scope (financial, hr, global, owner)
 * @param {string} query - Original user query
 * @param {string} companyId - Company ID
 * @returns {Object} Query configuration
 */
export function buildQuery(intent, scope, query, companyId) {
  const lowerQuery = query.toLowerCase();
  
  // Extract date ranges
  const dateRange = extractDateRange(lowerQuery);
  
  // Extract filters
  const filters = extractFilters(lowerQuery, scope);
  
  // Extract aggregation needs
  const needsAggregation = needsAggregationCheck(intent, lowerQuery);
  
  // Build base query config
  const queryConfig = {
    collection: getCollectionPath(scope, companyId),
    filters: filters,
    dateRange: dateRange,
    orderBy: extractOrderBy(lowerQuery),
    limit: extractLimit(lowerQuery),
    aggregation: needsAggregation ? extractAggregation(intent, lowerQuery) : null
  };
  
  return queryConfig;
}

/**
 * Get Firestore collection path based on scope
 */
function getCollectionPath(scope, companyId) {
  const paths = {
    financial: {
      expenses: `companies/${companyId}/expenses`,
      income: `companies/${companyId}/income`,
      invoices: `companies/${companyId}/invoices`,
      accounts: `companies/${companyId}/financialAccounts`
    },
    hr: {
      team: `companies/${companyId}/teamMembers`,
      invitations: `companies/${companyId}/invitations`
    },
    global: {
      companies: `companies/${companyId}`
    }
  };
  
  return paths[scope] || paths.global;
}

/**
 * Extract date range from query
 */
function extractDateRange(query) {
  const now = new Date();
  const ranges = {
    'today': { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() },
    'yesterday': {
      start: new Date(now.setDate(now.getDate() - 1)),
      end: new Date(now.setHours(23, 59, 59, 999))
    },
    'this week': {
      start: new Date(now.setDate(now.getDate() - now.getDay())),
      end: new Date()
    },
    'this month': {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date()
    },
    'last month': {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0)
    },
    'this year': {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date()
    },
    'last 7 days': {
      start: new Date(now.setDate(now.getDate() - 7)),
      end: new Date()
    },
    'last 30 days': {
      start: new Date(now.setDate(now.getDate() - 30)),
      end: new Date()
    }
  };
  
  for (const [key, value] of Object.entries(ranges)) {
    if (query.includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Extract filters from query
 */
function extractFilters(query, scope) {
  const filters = [];
  
  // Category filters
  const categories = ['subscription', 'office', 'travel', 'marketing', 'software', 'utilities'];
  for (const category of categories) {
    if (query.includes(category)) {
      filters.push({ field: 'category', operator: '==', value: category });
    }
  }
  
  // Status filters
  if (query.includes('paid')) {
    filters.push({ field: 'status', operator: '==', value: 'paid' });
  }
  if (query.includes('unpaid') || query.includes('pending')) {
    filters.push({ field: 'status', operator: '==', value: 'unpaid' });
  }
  if (query.includes('overdue')) {
    filters.push({ field: 'status', operator: '==', value: 'overdue' });
  }
  if (query.includes('draft')) {
    filters.push({ field: 'approvalStatus', operator: '==', value: 'draft' });
  }
  if (query.includes('approved')) {
    filters.push({ field: 'approvalStatus', operator: '==', value: 'approved' });
  }
  
  // Amount filters
  const amountMatch = query.match(/(?:over|above|more than|greater than)\s*[€$]?(\d+)/i);
  if (amountMatch) {
    filters.push({ field: 'amount', operator: '>', value: parseFloat(amountMatch[1]) });
  }
  
  const amountMatchLess = query.match(/(?:under|below|less than|smaller than)\s*[€$]?(\d+)/i);
  if (amountMatchLess) {
    filters.push({ field: 'amount', operator: '<', value: parseFloat(amountMatchLess[1]) });
  }
  
  return filters;
}

/**
 * Check if query needs aggregation
 */
function needsAggregationCheck(intent, query) {
  if (intent === 'analytics' || intent === 'comparison' || intent === 'calculation') {
    return true;
  }
  
  const aggregationKeywords = [
    'total', 'sum', 'average', 'avg', 'mean', 'count',
    'compare', 'vs', 'versus', 'difference', 'trend',
    'analyze', 'analysis', 'insight', 'statistics'
  ];
  
  return aggregationKeywords.some(keyword => query.includes(keyword));
}

/**
 * Extract aggregation type
 */
function extractAggregation(intent, query) {
  if (query.includes('total') || query.includes('sum')) {
    return { type: 'sum', field: 'amount' };
  }
  if (query.includes('average') || query.includes('avg') || query.includes('mean')) {
    return { type: 'avg', field: 'amount' };
  }
  if (query.includes('count') || query.includes('number of')) {
    return { type: 'count', field: null };
  }
  if (query.includes('compare') || query.includes('vs') || query.includes('versus')) {
    return { type: 'compare', fields: ['income', 'expenses'] };
  }
  
  return { type: 'sum', field: 'amount' }; // Default
}

/**
 * Extract order by from query
 */
function extractOrderBy(query) {
  if (query.includes('latest') || query.includes('recent') || query.includes('newest')) {
    return { field: 'date', direction: 'desc' };
  }
  if (query.includes('oldest') || query.includes('earliest')) {
    return { field: 'date', direction: 'asc' };
  }
  if (query.includes('highest') || query.includes('largest') || query.includes('biggest')) {
    return { field: 'amount', direction: 'desc' };
  }
  if (query.includes('lowest') || query.includes('smallest')) {
    return { field: 'amount', direction: 'asc' };
  }
  
  return { field: 'date', direction: 'desc' }; // Default
}

/**
 * Extract limit from query
 */
function extractLimit(query) {
  const limitMatch = query.match(/(?:show|list|get|find|display)\s*(?:the\s*)?(?:last|first|top)?\s*(\d+)/i);
  if (limitMatch) {
    return parseInt(limitMatch[1], 10);
  }
  
  if (query.includes('all')) {
    return 1000; // Large limit for "all"
  }
  
  return 10; // Default limit
}

/**
 * Execute query and return data
 * This is a helper for the Cloud Function to use
 */
export function getQueryDescription(queryConfig) {
  let description = `Query ${queryConfig.collection}`;
  
  if (queryConfig.filters.length > 0) {
    description += ` with filters: ${queryConfig.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ')}`;
  }
  
  if (queryConfig.dateRange) {
    description += ` from ${queryConfig.dateRange.start.toISOString().split('T')[0]} to ${queryConfig.dateRange.end.toISOString().split('T')[0]}`;
  }
  
  if (queryConfig.aggregation) {
    description += ` with ${queryConfig.aggregation.type} aggregation`;
  }
  
  return description;
}

