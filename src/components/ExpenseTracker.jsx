// src/components/ExpenseTracker.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FaPlusCircle,
  FaChartLine,
  FaCalendarAlt,
  FaFileAlt,
  FaDownload,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaPlus,
  FaMapMarkerAlt,
  FaDatabase,
  FaPaperclip
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import FileUpload from './FileUpload';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getUserAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  uploadExpenseFile,
  deleteExpenseFile
} from '../firebase';

const ExpenseTracker = () => {
  const { currentUser, logout } = useAuth();
  
  // Constants
  const categories = ['Subscriptions', 'Office', 'One-time', 'Donations', 'Marketing', 'Other'];
  const btw_rates = [0, 9, 21];
  const bankAccounts = ['Business Checking', 'Business Savings', 'Credit Card - Business', 'Cash', 'Personal (Reimbursable)'];
  const paymentMethods = ['Debit Card', 'Credit Card', 'Bank Transfer', 'Cash', 'PayPal', 'Other'];
  const STORAGE_KEY = 'expense_tracker_data';

  // Load Initial Data
  const loadInitialData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (error) {
      console.log('localStorage not available, using default data');
    }
    
    return [
      {
        id: 1,
        name: 'My Company',
        expenses: []
      }
    ];
  };

  // State Management
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState(loadInitialData);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [currentAccountId, setCurrentAccountId] = useState(() => {
    const saved = loadInitialData();
    return saved[0]?.id || 1;
  });

  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Attachments modal state
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingExpense, setViewingExpense] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    bankAccount: 'all',
    paymentMethod: 'all',
    periodType: 'all',
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
    bankAccount: 'Business Checking',
    paymentMethod: 'Debit Card',
    notes: ''
  });

  // Load expenses from Firebase when component mounts
  useEffect(() => {
    if (currentUser) {
      loadExpenses();
    }
  }, [currentUser]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const userExpenses = await getUserExpenses(currentUser.uid);
      setExpenses(userExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
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

      if (editingExpense) {
        // Update existing expense
        expenseId = editingExpense.id;
        await updateExpense(currentUser.uid, expenseId, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Add new expense
        expenseId = await addExpense(currentUser.uid, {
          ...formData,
          accountId: currentAccountId,
          createdAt: new Date().toISOString()
        });
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
            }
          );
          
          completedUploads++;
          setUploadProgress((completedUploads / selectedFiles.length) * 100);
          uploadedFiles.push(fileMetadata);
        }

        // Update expense with file metadata
        const existingExpenseDoc = await updateExpense(currentUser.uid, expenseId, {
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
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(currentUser.uid, expenseId);
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

  // Calculate totals
  const calculateTotals = useMemo(() => {
    const filtered = expenses.filter(exp => {
      if (selectedAccount !== 'all' && exp.accountId !== selectedAccount) return false;
      if (filters.category !== 'all' && exp.category !== filters.category) return false;
      if (filters.bankAccount !== 'all' && exp.bankAccount !== filters.bankAccount) return false;
      if (filters.paymentMethod !== 'all' && exp.paymentMethod !== filters.paymentMethod) return false;
      if (filters.startDate && exp.date < filters.startDate) return false;
      if (filters.endDate && exp.date > filters.endDate) return false;
      return true;
    });

    const total = filtered.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const byCategory = categories.reduce((acc, cat) => {
      acc[cat] = filtered
        .filter(exp => exp.category === cat)
        .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      return acc;
    }, {});

    return { total, byCategory, count: filtered.length };
  }, [expenses, selectedAccount, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/branding/logo/logo-light.svg" alt="Biz-CoPilot" className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-gray-900">Biz-CoPilot</h1>
            </div>
            <UserProfile />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('expenses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'expenses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setCurrentView('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports
            </button>
          </div>
        </div>
      </nav>

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Account
                  </label>
                  <select
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {bankAccounts.map(account => (
                      <option key={account} value={account}>{account}</option>
                    ))}
                  </select>
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
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">€{calculateTotals.total.toFixed(2)}</p>
              </div>
              <FaChartLine className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{calculateTotals.count}</p>
              </div>
              <FaFileAlt className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">€0.00</p>
              </div>
              <FaCalendarAlt className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Add Expense Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddExpense(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FaPlusCircle className="w-5 h-5 mr-2" />
            Add Expense
          </button>
        </div>

        {/* Expenses Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">Recent Expenses</h2>
          </div>
          <div className="w-full">
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
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                      No expenses yet. Click "Add Expense" to get started.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
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
          </>
        )}

        {/* Expenses View */}
        {currentView === 'expenses' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">All Expenses</h2>

            {/* Add Expense Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowAddExpense(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaPlusCircle className="w-5 h-5 mr-2" />
                Add Expense
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                value={filters.bankAccount}
                onChange={(e) => setFilters({...filters, bankAccount: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Bank Accounts</option>
                {bankAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>

              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Payment Methods</option>
                {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
              </select>

              {(filters.category !== 'all' || filters.bankAccount !== 'all' || filters.paymentMethod !== 'all') && (
                <button
                  onClick={() => setFilters({category: 'all', bankAccount: 'all', paymentMethod: 'all', periodType: 'all', startDate: '', endDate: ''})}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Expenses Table */}
            <div className="w-full">
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
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                        No expenses yet. Click "Add Expense" to get started.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
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
        )}

        {/* Reports View */}
        {currentView === 'reports' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Expense Reports</h2>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Reports coming soon!</p>
              <p className="mt-2">Charts and analytics will be displayed here.</p>
            </div>
          </div>
        )}
      </main>

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
