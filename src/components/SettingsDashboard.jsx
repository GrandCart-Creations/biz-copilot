/**
 * SETTINGS DASHBOARD MODULE
 * 
 * Placeholder component for company and account settings
 * Will be fully implemented in future phases
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import TeamManagement from './TeamManagement';
import PeopleWorkspace from './PeopleWorkspace';
import FinancialAccounts from './FinancialAccounts';
import FundingAndInvestors from './FundingAndInvestors';
import CompanyBranding from './CompanyBranding';
import CompanyOnboarding from './CompanyOnboarding';
import Contracts from './Contracts';
import AccountBalanceRepair from './AccountBalanceRepair';
import {
  FaCog,
  FaBuilding,
  FaUsers,
  FaUserTie,
  FaBell,
  FaArrowLeft,
  FaUniversity,
  FaSeedling,
  FaPaintBrush,
  FaRocket,
  FaStream,
  FaFileContract,
  FaTools
} from 'react-icons/fa';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';

const SettingsDashboard = () => {
  const navigate = useNavigate();
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const [loading] = useState(false);
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'people' | 'accounts' | 'funding' | 'branding' | 'onboarding' | 'contracts' | 'repair'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);
  const tabButtonClasses = 'px-5 py-3 text-sm font-medium transition-all rounded-xl border flex items-center gap-2 focus:outline-none';
  const tabStyle = (tabId, disabled = false) => {
    const isActive = activeTab === tabId;
    const baseBg = disabled ? '#1F2937' : isActive ? accentColor : '#111827';
    const baseColor = disabled ? '#6B7280' : isActive ? '#FFFFFF' : '#9CA3AF';
    return {
      backgroundColor: baseBg,
      color: baseColor,
      borderColor: 'transparent',
      boxShadow: isActive ? '0 12px 28px rgba(0, 92, 112, 0.25)' : 'none',
      transform: isActive ? 'scale(1.02)' : 'scale(1)',
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer'
    };
  };
  const iconColor = (tabId, disabled = false) => {
    if (disabled) return '#6B7280';
    return activeTab === tabId ? '#FFFFFF' : '#9CA3AF';
  };
  const tabItems = [
    { id: 'team', label: 'Team Management', icon: FaUsers },
    { id: 'people', label: 'People Workspace', icon: FaUserTie },
    { id: 'accounts', label: 'Financial Accounts', icon: FaUniversity, roles: ['owner'] },
    { id: 'contracts', label: 'Contracts', icon: FaFileContract, roles: ['owner', 'manager'] },
    { id: 'funding', label: 'Funding & Investors', icon: FaSeedling, roles: ['owner', 'manager'] },
    { id: 'branding', label: 'Branding', icon: FaPaintBrush, roles: ['owner'] },
    { id: 'onboarding', label: 'Onboarding', icon: FaRocket, roles: ['owner'] },
    { id: 'repair', label: 'Account Repair', icon: FaTools, roles: ['owner'] }
  ];
  const visibleTabs = tabItems.filter(tab => !tab.roles || tab.roles.includes(userRole));

  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        {/* Header */}
        <nav className="text-white shadow-lg w-full" style={{ background: getHeaderBackground(null) }}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <img src={getHeaderLogo(null)} alt="Biz-CoPilot" className="h-[60px] w-auto" />
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
    <div className="w-full">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Settings Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap items-center gap-3">
              {visibleTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={tabButtonClasses}
                  style={tabStyle(id)}
                >
                  <Icon className="w-4 h-4" style={{ color: iconColor(id) }} />
                  {label}
                </button>
              ))}
              {userRole === 'owner' && (
                <button
                  onClick={() => navigate('/owner/activity')}
                  className={`${tabButtonClasses} ml-auto`}
                  style={{
                    backgroundColor: accentColor,
                    color: '#FFFFFF',
                    boxShadow: '0 12px 28px rgba(0, 92, 112, 0.25)'
                  }}
                  title="Open owner timeline"
                >
                  <FaUsers className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                  Activity Timeline
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'team' && <TeamManagement />}
          {activeTab === 'people' && <PeopleWorkspace />}
          {activeTab === 'accounts' && <FinancialAccounts />}
          {activeTab === 'contracts' && <Contracts />}
          {activeTab === 'funding' && <FundingAndInvestors />}
          {activeTab === 'branding' && <CompanyBranding />}
          {activeTab === 'onboarding' && <CompanyOnboarding />}
          {activeTab === 'repair' && <AccountBalanceRepair />}
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

