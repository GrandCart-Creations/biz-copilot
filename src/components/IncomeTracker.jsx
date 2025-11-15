/**
 * INCOME TRACKER MODULE
 * 
 * Full income/revenue tracking component
 * Mirrors ExpenseTracker structure for consistency
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlusCircle,
  FaChartLine,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTimes,
  FaPaperclip,
  FaDownload,
  FaFileAlt,
  FaSave,
  FaDollarSign
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import FileUpload from './FileUpload';
import CompanySelector from './CompanySelector';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import FinancialAccountSelect from './FinancialAccountSelect';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyIncome,
  addCompanyIncome,
  updateCompanyIncome,
  deleteCompanyIncome
} from '../firebase';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';

const IncomeTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);
  
  // Constants
  const incomeSources = ['Client Payment', 'Service Fee', 'Product Sales', 'Investment Return', 'Grant', 'Loan Disbursement', 'Other'];
  const categories = ['Service Revenue', 'Product Sales', 'Investment', 'Grant', 'Loan', 'Other'];
  const btw_rates = [0, 9, 21];

  // State Management
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Attachments modal state
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingIncome, setViewingIncome] = useState(null);

  // Track last loaded company to prevent unnecessary reloads
  const lastLoadedCompanyIdRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    source: 'all',
    periodType: 'all', // 'all', 'today', 'week', 'month', 'year', 'custom'
    startDate: '',
    endDate: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    source: 'Client Payment',
    customer: '',
    description: '',
    amount: '',
    currency: 'EUR',
    btw: 21,
    financialAccountId: '',
    invoiceId: '',
    transactionId: '',
    category: 'Service Revenue',
    notes: ''
  });

  // Load income from Firebase when component mounts or company changes
  useEffect(() => {
    if (!currentUser || !currentCompanyId) {
      setIncome([]);
      setLoading(false);
      return;
    }
    
    // Only reload if company ID actually changed
    if (lastLoadedCompanyIdRef.current !== currentCompanyId) {
      console.log(`[IncomeTracker] Loading income for company: ${currentCompanyId}`);
      lastLoadedCompanyIdRef.current = currentCompanyId;
      loadIncome();
    }
  }, [currentUser, currentCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadIncome = async () => {
    if (!currentCompanyId) {
      console.warn('No company selected, cannot load income');
      setIncome([]);
      return;
    }

    try {
      setLoading(true);
      const companyIncome = await getCompanyIncome(currentCompanyId);
      setIncome(companyIncome || []);
    } catch (error) {
      console.error('Error loading income:', error);
      setIncome([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    setUploadingFiles(true);

    try {
      if (!currentCompanyId) {
        alert('Please select a company to add income.');
        setUploadingFiles(false);
        return;
      }

      let incomeId;
      if (editingIncome) {
        // Update existing income
        incomeId = editingIncome.id;
        await updateCompanyIncome(currentCompanyId, incomeId, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Add new income
        incomeId = await addCompanyIncome(currentCompanyId, currentUser.uid, {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }

      // TODO: Upload files if any (similar to expenses)

      // Reload income
      await loadIncome();

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        source: 'Client Payment',
        customer: '',
        description: '',
        amount: '',
        currency: 'EUR',
        btw: 21,
        financialAccountId: '',
        invoiceId: '',
        transactionId: '',
        category: 'Service Revenue',
        notes: ''
      });
      setSelectedFiles([]);
      setUploadProgress(0);

      setShowAddIncome(false);
      setEditingIncome(null);
    } catch (error) {
      console.error('Error saving income:', error);
      alert('Error saving income. Please try again.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    if (!currentCompanyId) {
      alert('Please select a company to delete income.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this income record?')) {
      try {
        await deleteCompanyIncome(currentCompanyId, incomeId);
        await loadIncome();
      } catch (error) {
        console.error('Error deleting income:', error);
        alert('Error deleting income. Please try again.');
      }
    }
  };

  const handleEditIncome = (incomeRecord) => {
    setFormData({
      date: incomeRecord.date,
      source: incomeRecord.source || 'Client Payment',
      customer: incomeRecord.customer || '',
      description: incomeRecord.description || '',
      amount: incomeRecord.amount,
      currency: incomeRecord.currency || 'EUR',
      btw: incomeRecord.btw || 21,
      financialAccountId: incomeRecord.financialAccountId || '',
      invoiceId: incomeRecord.invoiceId || '',
      transactionId: incomeRecord.transactionId || '',
      category: incomeRecord.category || 'Service Revenue',
      notes: incomeRecord.notes || ''
    });
    setEditingIncome(incomeRecord);
    setShowAddIncome(true);
  };

  // Helper function to get date range based on period type
  const getDateRange = (periodType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (periodType) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0]
        };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        return {
          startDate: yearStart.toISOString().split('T')[0],
          endDate: yearEnd.toISOString().split('T')[0]
        };
      default:
        return { startDate: '', endDate: '' };
    }
  };

  // Update date range when period type changes
  useEffect(() => {
    if (filters.periodType && filters.periodType !== 'all' && filters.periodType !== 'custom') {
      const dateRange = getDateRange(filters.periodType);
      setFilters(prev => ({
        ...prev,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }));
    }
  }, [filters.periodType]);

  // Filter income based on filters
  const filteredIncome = useMemo(() => {
    return income.filter(inc => {
      if (filters.category !== 'all' && inc.category !== filters.category) return false;
      if (filters.source !== 'all' && inc.source !== filters.source) return false;
      if (filters.startDate && inc.date < filters.startDate) return false;
      if (filters.endDate && inc.date > filters.endDate) return false;
      return true;
    });
  }, [income, filters]);

  // Calculate totals
  const totalIncome = useMemo(() => {
    return filteredIncome.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
  }, [filteredIncome]);

  const totalVAT = useMemo(() => {
    return filteredIncome.reduce((sum, inc) => {
      const amount = parseFloat(inc.amount) || 0;
      const vatRate = parseFloat(inc.btw || 0) / 100;
      return sum + (amount * vatRate);
    }, 0);
  }, [filteredIncome]);

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
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
              <ModuleNavigationButton currentModuleId="income" />
              
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: accentColor }}
              >
                <FaDollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Income Tracker</h1>
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <FaChartLine className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total VAT</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalVAT)}</p>
              </div>
              <FaFileAlt className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{filteredIncome.length}</p>
              </div>
              <FaDollarSign className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Filters and Add Button */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              {/* Period Filter */}
              <select
                value={filters.periodType}
                onChange={(e) => {
                  const newPeriodType = e.target.value;
                  if (newPeriodType === 'custom') {
                    setFilters({...filters, periodType: 'custom'});
                  } else {
                    setFilters({...filters, periodType: newPeriodType});
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* Custom Date Range (shown when custom is selected) */}
              {filters.periodType === 'custom' && (
                <>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="Start Date"
                  />
                  <span className="self-center text-gray-500">to</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="End Date"
                  />
                </>
              )}

              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                value={filters.source}
                onChange={(e) => setFilters({...filters, source: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="all">All Sources</option>
                {incomeSources.map(source => <option key={source} value={source}>{source}</option>)}
              </select>

              {(filters.category !== 'all' || filters.source !== 'all' || filters.periodType !== 'all') && (
                <button
                  onClick={() => setFilters({category: 'all', source: 'all', periodType: 'all', startDate: '', endDate: ''})}
                  className="px-3 py-2 text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            <button
              onClick={() => {
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  source: 'Client Payment',
                  customer: '',
                  description: '',
                  amount: '',
                  currency: 'EUR',
                  btw: 21,
                  financialAccountId: '',
                  invoiceId: '',
                  transactionId: '',
                  category: 'Service Revenue',
                  notes: ''
                });
                setEditingIncome(null);
                setShowAddIncome(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FaPlusCircle />
              Add Income
            </button>
          </div>
        </div>

        {/* Income List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-xl">Loading...</div>
          </div>
        ) : filteredIncome.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FaDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Income Records</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first income record.</p>
            <button
              onClick={() => setShowAddIncome(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Your First Income
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VAT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncome.map((incomeRecord) => (
                  <tr key={incomeRecord.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(incomeRecord.date).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {incomeRecord.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {incomeRecord.customer || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={incomeRecord.description || ''}>
                        {incomeRecord.description || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(incomeRecord.amount, incomeRecord.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incomeRecord.btw}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incomeRecord.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditIncome(incomeRecord)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        {(userRole === 'owner' || incomeRecord.createdBy === currentUser?.uid) && (
                          <button
                            onClick={() => handleDeleteIncome(incomeRecord.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Income Modal */}
        {showAddIncome && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingIncome ? 'Edit Income' : 'Add Income'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddIncome(false);
                    setEditingIncome(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveIncome} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {incomeSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer/Payer
                  </label>
                  <input
                    type="text"
                    name="customer"
                    value={formData.customer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Income description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BTW Rate (%)
                    </label>
                    <select
                      name="btw"
                      value={formData.btw}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {btw_rates.map(rate => (
                        <option key={rate} value={rate}>{rate}%</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <FinancialAccountSelect
                    value={formData.financialAccountId}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        financialAccountId: e.target.value
                      }));
                    }}
                    filterBy={['income']}
                    label="Financial Account"
                    required={false}
                    showBalance={true}
                    onAddAccount={() => {
                      window.open('/settings?tab=accounts', '_blank');
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice ID (Optional)
                    </label>
                    <input
                      type="text"
                      name="invoiceId"
                      value={formData.invoiceId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Invoice #"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="From bank statement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Additional notes"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddIncome(false);
                      setEditingIncome(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingFiles}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {uploadingFiles ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        {editingIncome ? 'Update Income' : 'Add Income'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeTracker;
