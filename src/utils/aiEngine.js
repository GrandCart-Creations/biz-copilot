/**
 * AI ENGINE SERVICE
 * 
 * Core AI processing service for natural language queries
 * Handles intent detection, query processing, and response generation
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

// Use europe-west1 region to match Cloud Function deployment
const functions = getFunctions(app, 'europe-west1');

/**
 * Process a natural language query
 * @param {string} query - User's natural language query
 * @param {string} scope - Data scope (global, financial, hr, owner)
 * @param {string} companyId - Current company ID
 * @param {string} userId - Current user ID
 * @returns {Promise<Object>} AI response with data and insights
 */
export async function processAIQuery(query, scope, companyId, userId) {
  try {
    const processQuery = httpsCallable(functions, 'processAIQuery');
    
    const result = await processQuery({
      query: query.trim(),
      scope,
      companyId,
      userId
    });

    return result.data;
  } catch (error) {
    console.error('Error processing AI query:', error);
    throw new Error(`Failed to process query: ${error.message}`);
  }
}

/**
 * Detect query intent
 * @param {string} query - User's query
 * @returns {string} Intent type (data_query, comparison, analytics, etc.)
 */
export function detectIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  // Intent patterns
  const patterns = {
    data_query: ['show', 'list', 'get', 'find', 'display', 'what are'],
    comparison: ['compare', 'vs', 'versus', 'difference', 'different'],
    analytics: ['analyze', 'analysis', 'insight', 'trend', 'pattern'],
    summary: ['summarize', 'summary', 'overview', 'summary of'],
    prediction: ['predict', 'forecast', 'project', 'estimate', 'will'],
    task: ['remind', 'create', 'add', 'set', 'schedule'],
    calculation: ['calculate', 'total', 'sum', 'average', 'how much']
  };

  for (const [intent, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      return intent;
    }
  }

  return 'data_query'; // Default intent
}

/**
 * Format AI response for display
 * @param {Object} response - Raw AI response
 * @returns {Object} Formatted response
 */
export function formatAIResponse(response) {
  if (!response) {
    return {
      text: 'I apologize, but I encountered an error processing your query.',
      data: null,
      type: 'error'
    };
  }

  return {
    text: response.text || response.message || 'Response received',
    data: response.data || null,
    type: response.type || 'text',
    insights: response.insights || [],
    suggestions: response.suggestions || []
  };
}

