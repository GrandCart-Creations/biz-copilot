/**
 * REPORTS DASHBOARD MODULE
 * 
 * Placeholder component for financial reports and analytics
 * Will be fully implemented in future phases
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import {
  FaFileAlt,
  FaChartBar,
  FaDownload,
  FaChartPie,
  FaArrowLeft
} from 'react-icons/fa';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';

const ReportsDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId } = useCompany();
  const [loading] = useState(false);
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);

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
        <nav className="text-white shadow-lg w-full" style={{ background: getHeaderBackground(null) }}>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <img src={getHeaderLogo(null)} alt="Biz-CoPilot" className="h-10 w-auto" />
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
            <FaFileAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Company Selected</h2>
            <p className="text-gray-600">Please select a company to view reports.</p>
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
              
              {/* Reports Icon & Title */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: accentColor }}
              >
                <FaFileAlt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
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
        {/* Coming Soon Message */}
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#D4F5EF' }}>
            <FaFileAlt className="w-12 h-12" style={{ color: accentColor }} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Reports Coming Soon</h2>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Generate comprehensive financial reports, analytics, and insights. This module is being
            developed and will be available soon.
          </p>
          
          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
            <div className="p-6 border border-gray-200 rounded-lg">
              <FaChartBar className="w-8 h-8 mb-4" style={{ color: accentColor }} />
              <h3 className="font-semibold text-gray-900 mb-2">Financial Reports</h3>
              <p className="text-sm text-gray-600">
                Profit & Loss, Balance Sheet, Cash Flow statements, and custom reports.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <FaChartPie className="w-8 h-8 mb-4" style={{ color: accentColor }} />
              <h3 className="font-semibold text-gray-900 mb-2">Visual Analytics</h3>
              <p className="text-sm text-gray-600">
                Interactive charts and graphs to visualize your financial data and trends.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <FaDownload className="w-8 h-8 mb-4" style={{ color: accentColor }} />
              <h3 className="font-semibold text-gray-900 mb-2">Export & Share</h3>
              <p className="text-sm text-gray-600">
                Export reports as PDF, Excel, or CSV. Share with your team or accountant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;

