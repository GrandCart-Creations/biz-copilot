/**
 * FINANCIAL ACCOUNT SELECT COMPONENT
 * 
 * Reusable dropdown selector for choosing financial accounts
 * Used in Expense and Income forms
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { getCompanyFinancialAccounts } from '../firebase';
import { FaUniversity, FaCreditCard, FaMoneyBillWave, FaChartLine, FaHandHoldingUsd, FaWallet, FaPlusCircle, FaSpinner } from 'react-icons/fa';

const FinancialAccountSelect = ({ 
  value, 
  onChange, 
  name = 'financialAccountId',
  filterBy = [], // e.g., ['expenses'] or ['income'] - filter accounts by linkedTo
  label = 'Financial Account',
  required = false,
  onAddAccount = null, // Callback to open add account modal
  showBalance = true, // Show current balance next to account name
  className = ''
}) => {
  const { currentCompanyId } = useCompany();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const accountTypeIcons = {
    bank: FaUniversity,
    credit_card: FaCreditCard,
    cash: FaMoneyBillWave,
    investment: FaChartLine,
    loan: FaHandHoldingUsd,
    other: FaWallet
  };

  useEffect(() => {
    loadAccounts();
  }, [currentCompanyId, filterBy]);

  const loadAccounts = async () => {
    if (!currentCompanyId) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let accountsList = await getCompanyFinancialAccounts(currentCompanyId);
      
      // Filter accounts if filterBy is specified
      if (filterBy.length > 0) {
        accountsList = accountsList.filter(account => {
          if (!account.linkedTo || account.linkedTo.length === 0) {
            return false; // Exclude accounts not linked to anything
          }
          // Account must be linked to at least one of the specified types
          return filterBy.some(filter => account.linkedTo.includes(filter));
        });
      }
      
      // Only show active accounts
      accountsList = accountsList.filter(account => account.isActive !== false);
      
      setAccounts(accountsList);
    } catch (error) {
      console.error('Error loading financial accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance, currency = 'EUR') => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(balance || 0);
  };

  const getAccountTypeIcon = (type) => {
    const Icon = accountTypeIcons[type] || FaWallet;
    return <Icon className="w-4 h-4 inline mr-2" />;
  };

  const getSelectedAccount = () => {
    return accounts.find(acc => acc.id === value);
  };

  const selectedAccount = getSelectedAccount();

  if (loading) {
    return (
      <div className={`${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="flex items-center gap-2 text-gray-500">
          <FaSpinner className="animate-spin" />
          <span className="text-sm">Loading accounts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          name={name}
          value={value || ''}
          onChange={(e) => onChange && onChange(e)}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
        >
          <option value="">Select an account...</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} {showBalance && account.currentBalance !== undefined && `(${formatBalance(account.currentBalance, account.currency)})`}
            </option>
          ))}
        </select>
        
        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* Selected Account Details */}
      {selectedAccount && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getAccountTypeIcon(selectedAccount.type)}
              <span className="text-sm font-medium text-gray-900">{selectedAccount.name}</span>
            </div>
            {showBalance && (
              <span className="text-sm font-semibold text-blue-600">
                {formatBalance(selectedAccount.currentBalance, selectedAccount.currency)}
              </span>
            )}
          </div>
          {selectedAccount.bankName && (
            <p className="text-xs text-gray-600 mt-1">{selectedAccount.bankName}</p>
          )}
          {selectedAccount.accountNumber && (
            <p className="text-xs text-gray-500 font-mono">{selectedAccount.accountNumber}</p>
          )}
        </div>
      )}
      
      {/* Add Account Button */}
      {onAddAccount && (
        <button
          type="button"
          onClick={onAddAccount}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <FaPlusCircle className="w-3 h-3" />
          Add New Account
        </button>
      )}
      
      {accounts.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">
          No accounts available. {onAddAccount && (
            <button
              type="button"
              onClick={onAddAccount}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Add your first account
            </button>
          )}
        </p>
      )}
    </div>
  );
};

export default FinancialAccountSelect;

