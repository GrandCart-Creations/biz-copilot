/**
 * FINANCIAL ACCOUNTS MANAGEMENT COMPONENT
 * 
 * Allows owners/managers to:
 * - View all financial accounts
 * - Add new accounts (bank, credit card, cash, etc.)
 * - Edit account details
 * - Delete accounts
 * - View account balances
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanyFinancialAccounts,
  addFinancialAccount,
  updateFinancialAccount,
  deleteFinancialAccount
} from '../firebase';
import {
  FaUniversity,
  FaCreditCard,
  FaMoneyBillWave,
  FaChartLine,
  FaHandHoldingUsd,
  FaWallet,
  FaPlusCircle,
  FaEdit,
  FaTrash,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaInfoCircle
} from 'react-icons/fa';

const FinancialAccounts = () => {
  const { currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    currency: 'EUR',
    initialBalance: '',
    description: '',
    linkedTo: [],
    
    // Bank Account Fields
    bankName: '',
    accountNumber: '',
    iban: '',
    swift: '',
    
    // Card Fields
    cardLastFour: '',
    cardType: '',
    cardHolderName: '',
    expiryDate: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const accountTypes = [
    { value: 'bank', label: 'Bank Account', icon: FaUniversity },
    { value: 'credit_card', label: 'Credit Card', icon: FaCreditCard },
    { value: 'cash', label: 'Cash', icon: FaMoneyBillWave },
    { value: 'investment', label: 'Investment', icon: FaChartLine },
    { value: 'loan', label: 'Loan Account', icon: FaHandHoldingUsd },
    { value: 'other', label: 'Other', icon: FaWallet }
  ];
  
  const linkToOptions = [
    { value: 'expenses', label: 'Expenses' },
    { value: 'income', label: 'Income' },
    { value: 'funding', label: 'Funding' }
  ];
  
  // OWNER ONLY: Financial accounts are sensitive
  const canManageAccounts = userRole === 'owner';
  
  // If not owner, show access denied message
  if (!canManageAccounts) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FaUniversity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">
            Financial accounts management is restricted to company owners only.
          </p>
        </div>
      </div>
    );
  }
  
  // Load accounts when component mounts or company changes
  useEffect(() => {
    loadAccounts();
  }, [currentCompanyId]);
  
  const loadAccounts = async () => {
    if (!currentCompanyId) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const accountsList = await getCompanyFinancialAccounts(currentCompanyId);
      setAccounts(accountsList);
    } catch (error) {
      console.error('Error loading financial accounts:', error);
      setError('Failed to load financial accounts');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle linkedTo array
      if (name === 'linkedTo') {
        setFormData(prev => ({
          ...prev,
          linkedTo: checked
            ? [...prev.linkedTo, value]
            : prev.linkedTo.filter(item => item !== value)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleAddAccount = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      type: 'bank',
      currency: 'EUR',
      initialBalance: '',
      description: '',
      linkedTo: [],
      bankName: '',
      accountNumber: '',
      iban: '',
      swift: '',
      cardLastFour: '',
      cardType: '',
      cardHolderName: '',
      expiryDate: ''
    });
    setError('');
    setSuccess('');
    setShowAddModal(true);
  };
  
  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name || '',
      type: account.type || 'bank',
      currency: account.currency || 'EUR',
      initialBalance: account.initialBalance || '',
      description: account.description || '',
      linkedTo: account.linkedTo || [],
      bankName: account.bankName || '',
      accountNumber: account.accountNumber || '',
      iban: account.iban || '',
      swift: account.swift || '',
      cardLastFour: account.cardLastFour || '',
      cardType: account.cardType || '',
      cardHolderName: account.cardHolderName || '',
      expiryDate: account.expiryDate || ''
    });
    setError('');
    setSuccess('');
    setShowEditModal(true);
  };
  
  const handleDeleteAccount = (account) => {
    setDeletingAccount(account);
    setShowDeleteConfirm(true);
  };
  
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!formData.name.trim()) {
      setError('Account name is required');
      return;
    }
    
    setSaving(true);
    
    try {
      if (editingAccount) {
        // Update existing account
        await updateFinancialAccount(currentCompanyId, editingAccount.id, formData);
        setSuccess('Account updated successfully');
      } else {
        // Add new account
        await addFinancialAccount(currentCompanyId, currentUser.uid, formData);
        setSuccess('Account added successfully');
      }
      
      await loadAccounts();
      
      setTimeout(() => {
        setShowAddModal(false);
        setShowEditModal(false);
        setFormData({
          name: '',
          type: 'bank',
          currency: 'EUR',
          initialBalance: '',
          description: '',
          linkedTo: [],
          bankName: '',
          accountNumber: '',
          iban: '',
          swift: '',
          cardLastFour: '',
          cardType: '',
          cardHolderName: '',
          expiryDate: ''
        });
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Error saving account:', error);
      setError(error.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!deletingAccount) return;
    
    setSaving(true);
    try {
      await deleteFinancialAccount(currentCompanyId, deletingAccount.id);
      setSuccess('Account deleted successfully');
      await loadAccounts();
      setTimeout(() => {
        setShowDeleteConfirm(false);
        setDeletingAccount(null);
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };
  
  const getAccountTypeIcon = (type) => {
    const typeConfig = accountTypes.find(t => t.value === type);
    const Icon = typeConfig?.icon || FaWallet;
    return <Icon className="w-5 h-5" />;
  };
  
  const formatBalance = (balance, currency = 'EUR') => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency
    }).format(balance || 0);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Accounts</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage bank accounts, credit cards, and other financial accounts
          </p>
        </div>
        {canManageAccounts && (
          <button
            onClick={handleAddAccount}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FaPlusCircle />
            Add Account
          </button>
        )}
      </div>
      
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}
      
      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FaUniversity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Financial Accounts</h3>
          <p className="text-gray-600 mb-4">
            Get started by adding your first financial account.
          </p>
          {canManageAccounts && (
            <button
              onClick={handleAddAccount}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {getAccountTypeIcon(account.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{account.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{account.type.replace('_', ' ')}</p>
                  </div>
                </div>
                {canManageAccounts && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Account"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    {userRole === 'owner' && (
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Account"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Current Balance</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatBalance(account.currentBalance, account.currency)}
                  </p>
                </div>
                
                {account.bankName && (
                  <div>
                    <p className="text-xs text-gray-500">Bank</p>
                    <p className="text-sm text-gray-700">{account.bankName}</p>
                  </div>
                )}
                
                {account.accountNumber && (
                  <div>
                    <p className="text-xs text-gray-500">Account Number</p>
                    <p className="text-sm text-gray-700 font-mono">{account.accountNumber}</p>
                  </div>
                )}
                
                {account.cardLastFour && (
                  <div>
                    <p className="text-xs text-gray-500">Card</p>
                    <p className="text-sm text-gray-700">
                      {account.cardType} •••• {account.cardLastFour}
                    </p>
                  </div>
                )}
                
                {account.linkedTo && account.linkedTo.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">Used For</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {account.linkedTo.map((link) => (
                        <span
                          key={link}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {link}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {account.description && (
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-700">{account.description}</p>
                  </div>
                )}
                
                {!account.isActive && (
                  <div className="mt-2">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      Inactive
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add/Edit Account Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingAccount ? 'Edit Account' : 'Add Financial Account'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setError('');
                  setSuccess('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAccount} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Main Business Checking"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {accountTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Balance
                    </label>
                    <input
                      type="number"
                      name="initialBalance"
                      value={formData.initialBalance}
                      onChange={handleInputChange}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional description"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Linked To (select all that apply)
                    </label>
                    <div className="space-y-2">
                      {linkToOptions.map(option => (
                        <label key={option.value} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="linkedTo"
                            value={option.value}
                            checked={formData.linkedTo.includes(option.value)}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <FaInfoCircle className="inline w-3 h-3 mr-1" />
                      Select which modules this account will be used for
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Bank Account Details */}
              {formData.type === 'bank' && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., ING, Rabobank"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="NL**INGB****1234"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          IBAN
                        </label>
                        <input
                          type="text"
                          name="iban"
                          value={formData.iban}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="NL91ABNA0417164300"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SWIFT/BIC
                      </label>
                      <input
                        type="text"
                        name="swift"
                        value={formData.swift}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="INGBNL2A"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Credit Card Details */}
              {formData.type === 'credit_card' && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Card Details</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Type
                        </label>
                        <select
                          name="cardType"
                          value={formData.cardType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="Amex">American Express</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last 4 Digits
                        </label>
                        <input
                          type="text"
                          name="cardLastFour"
                          value={formData.cardLastFour}
                          onChange={handleInputChange}
                          maxLength="4"
                          pattern="[0-9]{4}"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="4321"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Holder Name
                        </label>
                        <input
                          type="text"
                          name="cardHolderName"
                          value={formData.cardHolderName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Biz-CoPilot"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="2026-12"
                          pattern="[0-9]{4}-[0-9]{2}"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  {success}
                </div>
              )}
              
              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaCheck />
                      {editingAccount ? 'Update Account' : 'Add Account'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Account?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deletingAccount.name}</strong>? 
              This action cannot be undone.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingAccount(null);
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialAccounts;

