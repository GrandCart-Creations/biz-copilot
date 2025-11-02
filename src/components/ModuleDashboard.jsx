/**
 * MODULE DASHBOARD
 * 
 * Dynamic dashboard with module tiles based on user permissions and subscription tier
 * Shows available modules as clickable cards
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { getVisibleModules, getModule, meetsTierRequirement } from '../utils/modules';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import {
  FaChartLine,
  FaDollarSign,
  FaFileAlt,
  FaBullhorn,
  FaChartArea,
  FaCog,
  FaUsers,
  FaShieldAlt,
  FaLock
} from 'react-icons/fa';

const ModuleDashboard = () => {
  const navigate = useNavigate();
  const { currentCompany, currentCompanyId, userRole, subscriptionTier, loading: companyLoading } = useCompany();

  // Get icon component by name
  const getIcon = (iconName) => {
    const icons = {
      FaChartLine,
      FaDollarSign,
      FaFileAlt,
      FaBullhorn,
      FaChartArea,
      FaCog,
      FaUsers,
      FaShieldAlt
    };
    return icons[iconName] || FaChartLine;
  };

  // Get color classes
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
      gray: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
      teal: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
      red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
    };
    return colors[color] || colors.blue;
  };

  // Get icon color classes
  const getIconColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      gray: 'bg-gray-100 text-gray-600',
      teal: 'bg-teal-100 text-teal-600',
      red: 'bg-red-100 text-red-600'
    };
    return colors[color] || colors.blue;
  };

  // Handle module click
  const handleModuleClick = (module) => {
    if (module.status === 'coming-soon') {
      return; // Don't navigate to coming-soon modules
    }
    
    if (!currentCompanyId) {
      alert('Please select a company to access this module.');
      return;
    }

    // Check subscription tier requirement
    const currentTier = subscriptionTier || 'business';
    const requiredTier = module.requiredTier || 'lite';
    
    if (!meetsTierRequirement(currentTier, requiredTier)) {
      // Redirect to subscription gate page
      navigate(`/modules/${module.id}/upgrade?required=${requiredTier}&current=${currentTier}`);
      return;
    }

    // Navigate to module route
    navigate(module.route);
  };

  // Loading state
  if (companyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // No company selected
  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <nav className="bg-gray-800 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaLock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Company Selected</h2>
            <p className="text-gray-600 mb-6">Please select or create a company to access the dashboard modules.</p>
            <p className="text-sm text-gray-500">Use the company selector in the header above.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get visible modules for current user (with subscription tier enforcement)
  const visibleModules = getVisibleModules(userRole || 'owner', subscriptionTier || 'business');

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to {currentCompany?.name || 'Your Company'}
          </h1>
          <p className="text-gray-600">Select a module to get started</p>
        </div>

        {/* Module Tiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleModules.map((module) => {
            const IconComponent = getIcon(module.icon);
            const colorClasses = getColorClasses(module.color);
            const iconColorClasses = getIconColorClasses(module.color);
            const isClickable = module.status === 'active';

            return (
              <div
                key={module.id}
                onClick={() => isClickable && handleModuleClick(module)}
                className={`
                  bg-white rounded-lg border-2 p-6 cursor-pointer transition-all duration-200
                  ${isClickable ? colorClasses : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'}
                  ${isClickable ? 'hover:shadow-lg transform hover:-translate-y-1' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isClickable ? iconColorClasses : 'bg-gray-200 text-gray-400'}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  {module.status === 'coming-soon' && (
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-600 rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{module.name}</h3>
                <p className="text-sm opacity-75">{module.description}</p>
                
                {!isClickable && module.status === 'coming-soon' && (
                  <div className="mt-4 flex items-center text-xs text-gray-500">
                    <FaLock className="w-3 h-3 mr-1" />
                    <span>
                      {module.requiredTier === 'business' && subscriptionTier === 'lite' 
                        ? 'Upgrade to Business tier' 
                        : 'Coming soon'}
                    </span>
                  </div>
                )}
                
                {/* Subscription Tier Gate Message */}
                {isClickable && module.requiredTier && subscriptionTier === 'lite' && module.requiredTier === 'business' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center text-xs text-yellow-800">
                      <FaLock className="w-3 h-3 mr-1" />
                      <span>Business tier required</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {visibleModules.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaChartLine className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Modules Available</h3>
            <p className="text-gray-600">You don't have access to any modules yet.</p>
            <p className="text-sm text-gray-500 mt-2">Contact your administrator for access.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleDashboard;

