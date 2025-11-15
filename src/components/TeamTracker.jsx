/**
 * TEAM TRACKER MODULE
 * 
 * Standalone Team Management module accessible from the module dashboard
 * Provides comprehensive team management functionality
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import TeamManagement from './TeamManagement';
import SubscriptionGate from './SubscriptionGate';
import { FaUsers, FaInfoCircle } from 'react-icons/fa';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';
import { meetsTierRequirement } from '../utils/modules';

const TeamTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, userRole, subscriptionTier } = useCompany();
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);
  
  // Check if user has required subscription tier
  const hasRequiredTier = useMemo(() => {
    const requiredTier = 'business';
    const currentTier = subscriptionTier || 'lite';
    return meetsTierRequirement(currentTier, requiredTier);
  }, [subscriptionTier]);

  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        <header className="bg-white shadow-sm border-b w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ModuleNavigationButton currentModuleId="team" />
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                  <FaUsers className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                  <p className="text-sm text-gray-500">{currentCompany?.name || 'Company'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <NotificationCenter />
                <CompanySelector />
                <UserProfile />
              </div>
            </div>
          </div>
        </header>

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
      {/* Header */}
      <header className="bg-white shadow-sm border-b w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ModuleNavigationButton currentModuleId="team" />
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                <FaUsers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                <p className="text-sm text-gray-500">{currentCompany?.name || 'Company'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <CompanySelector />
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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

