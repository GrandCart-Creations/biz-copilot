/**
 * SETTINGS DASHBOARD MODULE
 * 
 * Placeholder component for company and account settings
 * Will be fully implemented in future phases
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import TeamManagement from './TeamManagement';
import FinancialAccounts from './FinancialAccounts';
import FundingAndInvestors from './FundingAndInvestors';
import {
  FaCog,
  FaBuilding,
  FaUsers,
  FaBell,
  FaArrowLeft,
  FaUniversity,
  FaSeedling
} from 'react-icons/fa';

const SettingsDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const [loading] = useState(false);
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'accounts' | 'funding'
  
  const canManage = userRole === 'owner' || userRole === 'manager';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        {/* Header */}
        <nav className="bg-gray-800 text-white shadow-lg w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-lg">BC</span>
                  </div>
                  <span className="text-xl font-semibold">Biz-CoPilot</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <CompanySelector />
                <UserProfile />
              </div>
            </div>
          </div>
        </nav>

        {/* No Company Message */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FaCog className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Company Selected</h2>
            <p className="text-gray-600">Please select a company to manage settings.</p>
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
              {/* Back Button */}
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
              
              {/* Settings Icon & Title */}
              <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                <FaCog className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500">{currentCompany?.name || 'Company'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CompanySelector />
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Settings Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('team')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'team'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FaUsers className="w-4 h-4" />
                  Team Management
                </div>
              </button>
              {/* Financial Accounts tab - OWNER ONLY */}
              {userRole === 'owner' && (
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'accounts'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FaUniversity className="w-4 h-4" />
                    Financial Accounts
                  </div>
                </button>
              )}
              
              {/* Funding & Investors tab - OWNER/MANAGER */}
              {canManage && (
                <button
                  onClick={() => setActiveTab('funding')}
                  className={`px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'funding'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FaSeedling className="w-4 h-4" />
                    Funding & Investors
                  </div>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'team' && <TeamManagement />}
          {activeTab === 'accounts' && <FinancialAccounts />}
          {activeTab === 'funding' && <FundingAndInvestors />}
        </div>

        {/* Coming Soon Features */}
        <div className="mt-8 bg-white rounded-lg shadow p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Additional Settings (Coming Soon)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border border-gray-200 rounded-lg">
              <FaBuilding className="w-8 h-8 text-gray-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Company Profile</h3>
              <p className="text-sm text-gray-600">
                Update company information, logo, address, and business details.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <FaBell className="w-8 h-8 text-gray-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Preferences</h3>
              <p className="text-sm text-gray-600">
                Configure notifications, tax rates, currency, and regional settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDashboard;

