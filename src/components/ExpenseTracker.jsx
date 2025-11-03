// src/components/ExpenseTracker.jsx
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
  FaSave
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import FileUpload from './FileUpload';
import CompanySelector from './CompanySelector';
import FinancialAccountSelect from './FinancialAccountSelect';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyExpenses,
  addCompanyExpense,
  updateCompanyExpense,
  deleteCompanyExpense,
  uploadExpenseFile,
  deleteExpenseFile,
  updateAccountBalance
} from '../firebase';

const ExpenseTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, userRole, performExpenseMigration } = useCompany();
  
  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  
  // Constants
  const categories = ['Subscriptions', 'Office', 'One-time', 'Donations', 'Marketing', 'Other'];
  const btw_rates = [0, 9, 21];
  const bankAccounts = ['Business Checking', 'Business Savings', 'Credit Card - Business', 'Cash', 'Personal (Reimbursable)'];
  const paymentMethods = ['Debit Card', 'Credit Card', 'Bank Transfer', 'Cash', 'PayPal', 'Other'];

  // State Management
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [currentAccountId] = useState(1);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Attachments modal state
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingExpense, setViewingExpense] = useState(null);

  // Track last loaded company to prevent unnecessary reloads
  const lastLoadedCompanyIdRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    bankAccount: 'all',
    paymentMethod: 'all',
    periodType: 'all', // 'all', 'today', 'week', 'month', 'year', 'custom'
    startDate: '',
    endDate: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Subscriptions',
    vendor: '',
    invoiceNumber: '',
    vatNumber: '',
    chamberOfCommerceNumber: '',
    description: '',
    amount: '',
    btw: 21,
    bankAccount: 'Business Checking', // Keep for backward compatibility
    financialAccountId: '', // NEW: Link to financial accounts
    paymentMethod: 'Debit Card',
    notes: ''
  });

  // Load expenses from Firebase when component mounts or company changes
  useEffect(() => {
    if (!currentUser || !currentCompanyId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    
    // Only reload if company ID actually changed
    if (lastLoadedCompanyIdRef.current !== currentCompanyId) {
      console.log(`[ExpenseTracker] Loading expenses for company: ${currentCompanyId}`);
      lastLoadedCompanyIdRef.current = currentCompanyId;
      loadExpenses();
    }
  }, [currentUser, currentCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExpenses = async () => {
    if (!currentCompanyId) {
      console.warn('No company selected, cannot load expenses');
      setExpenses([]);
      return;
    }

    try {
      setLoading(true);
      const companyExpenses = await getCompanyExpenses(currentCompanyId);
      setExpenses(companyExpenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setUploadingFiles(true);
      let expenseId;

      if (!currentCompanyId) {
        alert('Please select a company to add expenses.');
        setUploadingFiles(false);
        return;
      }

      if (editingExpense) {
        // Update existing expense
        expenseId = editingExpense.id;
        const oldAmount = parseFloat(editingExpense.amount || 0);
        const newAmount = parseFloat(formData.amount || 0);
        const oldAccountId = editingExpense.financialAccountId;
        const newAccountId = formData.financialAccountId;
        
        await updateCompanyExpense(currentCompanyId, expenseId, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        
        // Update account balances if financial account is linked
        if (oldAccountId && oldAccountId !== newAccountId) {
          // Account changed: reverse old, apply new
          await updateAccountBalance(currentCompanyId, oldAccountId, oldAmount, 'expense');
          if (newAccountId) {
            await updateAccountBalance(currentCompanyId, newAccountId, -newAmount, 'expense');
          }
        } else if (newAccountId && oldAmount !== newAmount) {
          // Same account, different amount: adjust difference
          const difference = oldAmount - newAmount;
          if (difference !== 0) {
            await updateAccountBalance(currentCompanyId, newAccountId, difference, 'expense');
          }
        }
      } else {
        // Add new expense
        expenseId = await addCompanyExpense(currentCompanyId, currentUser.uid, {
          ...formData,
          accountId: currentAccountId,
          createdAt: new Date().toISOString()
        });
        
        // Update account balance if financial account is linked
        if (formData.financialAccountId && formData.amount) {
          const amount = parseFloat(formData.amount || 0);
          if (amount > 0) {
            await updateAccountBalance(currentCompanyId, formData.financialAccountId, -amount, 'expense');
          }
        }
      }

      // Upload files if any
      if (selectedFiles.length > 0) {
        const uploadedFiles = [];
        let completedUploads = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          
          const fileMetadata = await uploadExpenseFile(
            currentUser.uid,
            expenseId,
            file,
            (progress) => {
              // Calculate overall progress across all files
              const overallProgress = ((completedUploads + (progress / 100)) / selectedFiles.length) * 100;
              setUploadProgress(overallProgress);
            },
            currentCompanyId // Pass company ID for proper path structure
          );
          
          completedUploads++;
          setUploadProgress((completedUploads / selectedFiles.length) * 100);
          uploadedFiles.push(fileMetadata);
        }

        // Update expense with file metadata
        await updateCompanyExpense(currentCompanyId, expenseId, {
          attachments: uploadedFiles,
          updatedAt: new Date().toISOString()
        });
      }

      // Reload expenses
      await loadExpenses();

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'Subscriptions',
        vendor: '',
        invoiceNumber: '',
        vatNumber: '',
        chamberOfCommerceNumber: '',
        description: '',
        amount: '',
        btw: 21,
        bankAccount: 'Business Checking',
        financialAccountId: '',
        paymentMethod: 'Debit Card',
        notes: ''
      });
      setSelectedFiles([]);
      setUploadProgress(0);

      setShowAddExpense(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense. Please try again.');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Handle expense deletion
  const handleDeleteExpense = async (expenseId) => {
    if (!currentCompanyId) {
      alert('Please select a company to delete expenses.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteCompanyExpense(currentCompanyId, expenseId);
        await loadExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense. Please try again.');
      }
    }
  };

  // Handle expense edit
  const handleEditExpense = (expense) => {
    setFormData({
      date: expense.date,
      category: expense.category,
      vendor: expense.vendor,
      invoiceNumber: expense.invoiceNumber || '',
      vatNumber: expense.vatNumber || '',
      chamberOfCommerceNumber: expense.chamberOfCommerceNumber || '',
      description: expense.description,
      amount: expense.amount,
      btw: expense.btw,
      bankAccount: expense.bankAccount || 'Business Checking',
      financialAccountId: expense.financialAccountId || '',
      paymentMethod: expense.paymentMethod,
      notes: expense.notes || ''
    });
    setEditingExpense(expense);
    setShowAddExpense(true);
  };

  // Handle view attachments
  const handleViewAttachments = (expense) => {
    setViewingExpense(expense);
    setShowAttachmentsModal(true);
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

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (filters.category !== 'all' && exp.category !== filters.category) return false;
      if (filters.bankAccount !== 'all' && exp.bankAccount !== filters.bankAccount) return false;
      if (filters.paymentMethod !== 'all' && exp.paymentMethod !== filters.paymentMethod) return false;
      if (filters.startDate && exp.date < filters.startDate) return false;
      if (filters.endDate && exp.date > filters.endDate) return false;
      return true;
    });
  }, [expenses, filters]);

  // Calculate totals
  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => {
      const amount = parseFloat(exp.amount) || 0;
      // If amount is encrypted, skip calculation
      if (typeof amount === 'string' && exp.amount_encrypted) return sum;
      return sum + amount;
    }, 0);
  }, [filteredExpenses]);

  const totalVAT = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => {
      const amount = parseFloat(exp.amount) || 0;
      // If amount is encrypted, skip calculation
      if (typeof amount === 'string' && exp.amount_encrypted) return sum;
      const vatRate = parseFloat(exp.btw || 0) / 100;
      return sum + (amount * vatRate);
    }, 0);
  }, [filteredExpenses]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
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
              
              {/* Expense Icon & Title */}
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FaChartLine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
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

      {/* Add/Edit Expense Modal - Available in all views */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddExpense(false);
                    setEditingExpense(null);
                    setSelectedFiles([]);
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      category: 'Subscriptions',
                      vendor: '',
                      invoiceNumber: '',
                      vatNumber: '',
                      chamberOfCommerceNumber: '',
                      description: '',
                      amount: '',
                      btw: 21,
                      bankAccount: 'Business Checking',
                      paymentMethod: 'Debit Card',
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <input
                    type="text"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Vendor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Invoice #"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VAT Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chamber of Commerce Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="chamberOfCommerceNumber"
                    value={formData.chamberOfCommerceNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="KVK Number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Expense description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (€)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    BTW Rate (%)
                  </label>
                  <select
                    name="btw"
                    value={formData.btw}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {btw_rates.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FinancialAccountSelect
                    value={formData.financialAccountId}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        financialAccountId: e.target.value,
                        // Auto-populate bankAccount for backward compatibility if account is selected
                        bankAccount: e.target.value ? 'Financial Account' : prev.bankAccount
                      }));
                    }}
                    filterBy={['expenses']}
                    label="Financial Account"
                    required={false}
                    showBalance={true}
                    onAddAccount={() => {
                      // Open Settings page in a new tab or navigate
                      window.open('/settings?tab=accounts', '_blank');
                    }}
                  />
                  
                  {/* Fallback: Legacy bank account dropdown (hidden if financial account is selected) */}
                  {!formData.financialAccountId && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Account (Legacy)
                      </label>
                      <select
                        name="bankAccount"
                        value={formData.bankAccount}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {bankAccounts.map(account => (
                          <option key={account} value={account}>{account}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachments (Optional)
                </label>
                <FileUpload
                  files={selectedFiles}
                  onFilesChange={setSelectedFiles}
                  maxFiles={5}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>

              {uploadingFiles && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">
                      Uploading files...
                    </span>
                    <span className="text-sm text-blue-600">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExpense(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <FaSave className="w-4 h-4 inline mr-2" />
                  {editingExpense ? 'Update' : 'Save'} Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expense</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
              </div>
              <FaChartLine className="w-8 h-8 text-red-600" />
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
                <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
              </div>
              <FaFileAlt className="w-8 h-8 text-gray-600" />
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Start Date"
                  />
                  <span className="self-center text-gray-500">to</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="End Date"
                  />
                </>
              )}

              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                value={filters.bankAccount}
                onChange={(e) => setFilters({...filters, bankAccount: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Bank Accounts</option>
                {bankAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>

              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Payment Methods</option>
                {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
              </select>

              {(filters.category !== 'all' || filters.bankAccount !== 'all' || filters.paymentMethod !== 'all' || filters.periodType !== 'all') && (
                <button
                  onClick={() => setFilters({category: 'all', bankAccount: 'all', paymentMethod: 'all', periodType: 'all', startDate: '', endDate: ''})}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            <button
              onClick={() => {
                if (!currentCompanyId) {
                  alert('Please select a company to add expenses.');
                  return;
                }
                setShowAddExpense(true);
              }}
              disabled={!currentCompanyId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!currentCompanyId ? 'Please select a company first' : ''}
            >
              <FaPlusCircle />
              Add Expense
            </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Expenses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Category
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Vendor
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Invoice #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      Bank Account
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Payment
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Files
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center gap-4">
                          {!currentCompanyId ? (
                            <>
                              <p className="text-gray-500 text-lg font-medium">Please select a company to view expenses.</p>
                              <p className="text-sm text-gray-400">Use the company selector in the header to select or create a company.</p>
                            </>
                          ) : expenses.length === 0 ? (
                            <>
                              <p className="text-gray-500">No expenses yet.</p>
                              <button
                                onClick={async () => {
                                  setIsMigrating(true);
                                  setMigrationResult(null);
                                  try {
                                    const result = await performExpenseMigration(currentCompanyId);
                                    setMigrationResult(result);
                                    if (result.success && result.migratedCount > 0) {
                                      await loadExpenses();
                                    }
                                  } catch (error) {
                                    setMigrationResult({
                                      success: false,
                                      message: `Migration failed: ${error.message}`
                                    });
                                  } finally {
                                    setIsMigrating(false);
                                  }
                                }}
                                disabled={isMigrating}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                {isMigrating ? 'Migrating Expenses...' : 'Migrate Legacy Expenses to This Company'}
                              </button>
                              {migrationResult && (
                                <p className={`text-sm ${migrationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                  {migrationResult.message}
                                </p>
                              )}
                              <p className="text-sm text-gray-400">Or click "Add Expense" to get started.</p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-500">No expenses match your current filters.</p>
                              <button
                                onClick={() => setFilters({category: 'all', bankAccount: 'all', paymentMethod: 'all', periodType: 'all', startDate: '', endDate: ''})}
                                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Clear Filters
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-[120px] truncate" title={expense.vendor}>
                            {expense.vendor}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="max-w-[120px] truncate" title={expense.invoiceNumber || '-'}>
                            {expense.invoiceNumber || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          <div className="max-w-xs break-words">
                            {expense.description}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="max-w-[140px] truncate" title={expense.bankAccount || 'N/A'}>
                            {expense.bankAccount || 'N/A'}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {expense.paymentMethod}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          €{parseFloat(expense.amount).toFixed(2)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                          {expense.attachments && expense.attachments.length > 0 ? (
                            <button
                              onClick={() => handleViewAttachments(expense)}
                              className="inline-flex items-center text-blue-600 hover:text-blue-900"
                            >
                              <FaPaperclip className="w-4 h-4 mr-1" />
                              <span>{expense.attachments.length}</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Edit"
                          >
                            <FaEdit className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Attachments Modal */}
      {showAttachmentsModal && viewingExpense && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Attachments - {viewingExpense.vendor}
                </h3>
                <button
                  onClick={() => {
                    setShowAttachmentsModal(false);
                    setViewingExpense(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {viewingExpense.description} - €{parseFloat(viewingExpense.amount).toFixed(2)}
              </p>
            </div>

            <div className="px-6 py-4">
              {viewingExpense.attachments && viewingExpense.attachments.length > 0 ? (
                <div className="space-y-3">
                  {viewingExpense.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {attachment.fileType === 'application/pdf' ? (
                          <FaFileAlt className="w-8 h-8 text-red-500 flex-shrink-0" />
                        ) : (
                          <FaFileAlt className="w-8 h-8 text-blue-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.fileSize / 1024).toFixed(1)} KB • {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        {attachment.fileType.startsWith('image/') && (
                          <a
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                          >
                            View
                          </a>
                        )}
                        <a
                          href={attachment.fileUrl}
                          download={attachment.fileName}
                          className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <FaDownload className="w-4 h-4 inline mr-1" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No attachments for this expense.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAttachmentsModal(false);
                  setViewingExpense(null);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
