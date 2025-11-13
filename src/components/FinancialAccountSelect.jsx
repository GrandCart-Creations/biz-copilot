/**
 * FINANCIAL ACCOUNT SELECT COMPONENT
 * 
 * Reusable dropdown selector for choosing financial accounts
 * Used in Expense and Income forms
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  className = '',
  accounts: providedAccounts = undefined,
  loading: providedLoading = false,
  error: providedError = ''
}) => {
  const { currentCompanyId } = useCompany();
  const [internalAccounts, setInternalAccounts] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState('');

  const usingExternalAccounts = providedAccounts !== undefined && providedAccounts !== null;
  const shouldLoadInternally = !usingExternalAccounts;

  const accountTypeIcons = {
    bank: FaUniversity,
    credit_card: FaCreditCard,
    cash: FaMoneyBillWave,
    investment: FaChartLine,
    loan: FaHandHoldingUsd,
    other: FaWallet
  };

  useEffect(() => {
    if (!shouldLoadInternally) {
      setInternalAccounts([]);
      setInternalLoading(false);
      setInternalError('');
      return;
    }

    loadAccounts();
  }, [shouldLoadInternally, currentCompanyId, filterBy]);

  const loadAccounts = async () => {
    if (!currentCompanyId) {
      setInternalAccounts([]);
      setInternalLoading(false);
      setInternalError('');
      return;
    }

    try {
      setInternalLoading(true);
      const accountsList = await getCompanyFinancialAccounts(currentCompanyId);
      setInternalAccounts(Array.isArray(accountsList) ? accountsList : []);
    } catch (error) {
      console.error('Error loading financial accounts:', error);
      setInternalError('Failed to load accounts');
      setInternalAccounts([]);
    } finally {
      setInternalLoading(false);
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

  const rawAccounts = useMemo(() => {
    if (usingExternalAccounts) {
      return Array.isArray(providedAccounts) ? providedAccounts : [];
    }
    return internalAccounts;
  }, [usingExternalAccounts, providedAccounts, internalAccounts]);

  const filteredAccounts = useMemo(() => {
    if (!Array.isArray(rawAccounts)) {
      return [];
    }

    const results = [];
    const seen = new Map();

    rawAccounts.forEach((account) => {
      if (!account || !account.id) return;
      if (account.isActive === false) return;

      if (filterBy.length > 0) {
        const links = Array.isArray(account.linkedTo) ? account.linkedTo : [];
        if (links.length === 0) {
          return;
        }
        const matches = filterBy.some(filter => links.includes(filter));
        if (!matches) {
          return;
        }
      }

      if (!seen.has(account.id)) {
        seen.set(account.id, account);
        results.push(account);
      }
    });

    if (value && !seen.has(value)) {
      const existing = rawAccounts.find(account => account && account.id === value);
      if (existing && existing.isActive !== false) {
        results.push(existing);
      }
    }

    return results.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [rawAccounts, filterBy, value]);

  const selectedAccount = useMemo(() => {
    if (!value) return undefined;
    return rawAccounts.find(account => account && account.id === value);
  }, [rawAccounts, value]);

  const loading = usingExternalAccounts ? providedLoading : internalLoading;
  const error = usingExternalAccounts ? providedError : internalError;

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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white text-gray-900"
        >
          <option value="" className="text-gray-900">Select an account...</option>
          {filteredAccounts.map((account) => (
            <option key={account.id} value={account.id} className="text-gray-900">
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
      
      {filteredAccounts.length === 0 && !loading && (
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

