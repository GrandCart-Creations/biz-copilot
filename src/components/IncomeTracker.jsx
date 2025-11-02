/**
 * INCOME TRACKER MODULE
 * 
 * Placeholder component for income/revenue tracking
 * Will be fully implemented in future phases
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import {
  FaDollarSign,
  FaPlusCircle,
  FaChartLine,
  FaCalendarAlt,
  FaArrowLeft
} from 'react-icons/fa';

const IncomeTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId } = useCompany();
  const [loading] = useState(false);

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
            <FaDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Company Selected</h2>
            <p className="text-gray-600">Please select a company to track income.</p>
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
              
              {/* Income Icon & Title */}
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <FaDollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Income Tracker</h1>
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
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaDollarSign className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Income Tracking Coming Soon</h2>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Track revenue, invoices, and income streams all in one place. This module is being developed
            and will be available soon.
          </p>
          
          {/* Feature Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
            <div className="p-6 border border-gray-200 rounded-lg">
              <FaChartLine className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Revenue Tracking</h3>
              <p className="text-sm text-gray-600">
                Track all income sources and revenue streams with detailed categorization.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <FaCalendarAlt className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Income Analytics</h3>
              <p className="text-sm text-gray-600">
                View income trends, forecasts, and financial insights over time.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <FaPlusCircle className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Invoice Management</h3>
              <p className="text-sm text-gray-600">
                Create, send, and track invoices with automatic payment reminders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeTracker;

