/**
 * TEAM TRACKER MODULE
 * 
 * Standalone Team Management module accessible from the module dashboard
 * Provides comprehensive team management functionality
 * 
 * Note: Header is now provided by MainLayout's AppHeader - no duplicate header here
 */

import React, { useMemo } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import TeamManagement from './TeamManagement';
import SubscriptionGate from './SubscriptionGate';
import { FaUsers, FaInfoCircle } from 'react-icons/fa';
import { meetsTierRequirement } from '../utils/modules';

const TeamTracker = () => {
  const { currentCompany, currentCompanyId, subscriptionTier } = useCompany();
  
  // Check if user has required subscription tier
  const hasRequiredTier = useMemo(() => {
    const requiredTier = 'business';
    const currentTier = subscriptionTier || 'lite';
    return meetsTierRequirement(currentTier, requiredTier);
  }, [subscriptionTier]);

  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FaUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Company Selected</h2>
            <p className="text-gray-600">Please select a company to manage team members.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Main Content - Header is provided by MainLayout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Tier Check */}
        {!hasRequiredTier ? (
          <SubscriptionGate 
            requiredTier="business"
            currentTier={subscriptionTier || 'lite'}
            moduleName="Team Management"
          />
        ) : (
          <>
            {/* Subscription Tier Info Banner */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FaInfoCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Current Subscription: <span className="capitalize">{subscriptionTier || 'business'}</span> Tier
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Team Management requires Business tier. You have full access to all team management features.
                  </p>
                </div>
              </div>
            </div>
            
            <TeamManagement />
          </>
        )}
      </div>
    </div>
  );
};

export default TeamTracker;
