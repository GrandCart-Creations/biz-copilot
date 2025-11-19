/**
 * MODULE DASHBOARD
 * 
 * Simplified dashboard - navigation is handled by SidebarNavigation
 * This page shows a welcome message and placeholder for future dashboard widgets
 */

import React from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { FaLock } from 'react-icons/fa';

const ModuleDashboard = () => {
  const { currentCompany, currentCompanyId, loading: companyLoading } = useCompany();

  // Loading state
  if (companyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // No company selected
  if (!currentCompanyId) {
    return (
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
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to {currentCompany?.name || 'Your Company'}
        </h1>
        <p className="text-gray-600">Use the sidebar navigation to access modules</p>
      </div>

      {/* Quick Stats or Recent Activity - Future Enhancement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Placeholder for future dashboard widgets */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Overview</h3>
          <p className="text-sm text-gray-600">Quick stats and recent activity will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default ModuleDashboard;
