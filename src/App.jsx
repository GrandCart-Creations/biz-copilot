import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusCircle, TrendingUp, Calendar, FileText, Download, Edit2, Trash2, Save, X, Building2, Plus, MapPin, Database, Upload, Keyboard, Copy } from 'lucide-react';

const ExpenseTracker = () => {
  const categories = ['Subscriptions', 'Office', 'One-time', 'Donations', 'Marketing', 'Other'];
  const btw_rates = [0, 9, 21];
  const paymentMethods = ['Bank Transfer', 'Credit Card', 'Debit Card', 'Cash', 'PayPal', 'Stripe', 'Other'];
  
  const STORAGE_KEY = 'expense_tracker_data';
  
  // Load data from localStorage or use default
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
        name: 'Dutch Company Expense Tracker',
        expenses: []
      }
    ];
  };

  const [accounts, setAccounts] = useState(loadInitialData);
  const [currentAccountId, setCurrentAccountId] = useState(() => {
    const saved = loadInitialData();
    return saved[0]?.id || 1;
  });
  
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [dataStatus, setDataStatus] = useState('loaded');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const fileInputRef = useRef(null);

  // Save to localStorage whenever accounts change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      setDataStatus('saved');
      const timer = setTimeout(() => setDataStatus('loaded'), 2000);
      return () => clearTimeout(timer);
    } catch (error) {
      console.log('localStorage not available');
      setDataStatus('unsaved');
    }
  }, [accounts]);

  const currentAccount = accounts.find(acc => acc.id === currentAccountId);
  const expenses = currentAccount?.expenses || [];

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Subscriptions',
    description: '',
    amount: '',
    btw_rate: 21,
    recurring: 'monthly',
    vendor: '',
    vendorLocation: 'eu',
    paymentMethod: 'Bank Transfer',
    notes: ''
  });

  const [vendorInput, setVendorInput] = useState('');
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);

  const [filters, setFilters] = useState({
    category: 'all',
    period: 'all',
    startDate: '',
    endDate: ''
  });

  const [view, setView] = useState('dashboard');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Cmd/Ctrl + N: New expense
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setView('add');
      }
      // Cmd/Ctrl + D: Dashboard
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setView('dashboard');
      }
      // Cmd/Ctrl + L: List view
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        setView('list');
      }
      // Cmd/Ctrl + E: Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        exportData();
      }
      // Cmd/Ctrl + K: Keyboard shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
      // Escape: Close modals
      if (e.key === 'Escape') {
        setShowKeyboardHelp(false);
        setShowAccountModal(false);
        setShowBulkImport(false);
        setEditingExpense(null);
        setDeletingExpenseId(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [view]);

  // Get unique vendors with their last details
  const vendorHistory = useMemo(() => {
    const vendors = {};
    expenses.forEach(exp => {
      if (exp.vendor) {
        if (!vendors[exp.vendor] || new Date(exp.date) > new Date(vendors[exp.vendor].lastDate)) {
          vendors[exp.vendor] = {
            name: exp.vendor,
            lastAmount: exp.amount,
            lastBTWRate: exp.btw_rate,
            lastDate: exp.date,
            vendorLocation: exp.vendorLocation || 'eu',
            lastPaymentMethod: exp.paymentMethod || 'Bank Transfer'
          };
        }
      }
    });
    return Object.values(vendors);
  }, [expenses]);

  // Filter vendor suggestions
  const vendorSuggestions = useMemo(() => {
    if (!vendorInput) return [];
    return vendorHistory.filter(v => 
      v.name.toLowerCase().includes(vendorInput.toLowerCase())
    );
  }, [vendorInput, vendorHistory]);

  // Auto-adjust BTW based on vendor location
  useEffect(() => {
    if (formData.vendorLocation === 'non-eu') {
      setFormData(prev => ({ ...prev, btw_rate: 0 }));
    } else if (formData.btw_rate === 0 && formData.vendorLocation === 'eu') {
      setFormData(prev => ({ ...prev, btw_rate: 21 }));
    }
  }, [formData.vendorLocation]);

  const selectVendor = (vendor) => {
    setVendorInput(vendor.name);
    setFormData({
      ...formData,
      vendor: vendor.name,
      amount: vendor.lastAmount.toString(),
      btw_rate: vendor.lastBTWRate,
      vendorLocation: vendor.vendorLocation,
      paymentMethod: vendor.lastPaymentMethod
    });
    setShowVendorSuggestions(false);
  };

  const updateAccountExpenses = (newExpenses) => {
    setAccounts(accounts.map(acc => 
      acc.id === currentAccountId 
        ? { ...acc, expenses: newExpenses }
        : acc
    ));
  };

  const addExpense = () => {
    if (!formData.description || !formData.amount || formData.amount <= 0 || !vendorInput) {
      alert('Please fill in all required fields');
      return;
    }
    
    const newExpense = {
      id: Date.now(),
      ...formData,
      vendor: vendorInput,
      amount: parseFloat(formData.amount)
    };
    
    updateAccountExpenses([newExpense, ...expenses]);
    
    // Keep the date persistent, reset other fields
    setFormData({
      ...formData,
      category: 'Subscriptions',
      description: '',
      amount: '',
      recurring: 'monthly',
      notes: ''
    });
    setVendorInput('');
  };

  const duplicateExpense = (expense) => {
    const duplicated = {
      ...expense,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    updateAccountExpenses([duplicated, ...expenses]);
  };

  const startEditExpense = (expense) => {
    setEditingExpense({
      ...expense,
      amount: expense.amount.toString()
    });
  };

  const saveEditExpense = () => {
    if (!editingExpense.description || !editingExpense.amount || editingExpense.amount <= 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    const updatedExpenses = expenses.map(exp =>
      exp.id === editingExpense.id
        ? { ...editingExpense, amount: parseFloat(editingExpense.amount) }
        : exp
    );
    
    updateAccountExpenses(updatedExpenses);
    setEditingExpense(null);
  };

  const deleteExpense = (id) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    updateAccountExpenses(updatedExpenses);
    setDeletingExpenseId(null);
  };

  const addAccount = () => {
    if (!newAccountName.trim()) {
      alert('Please enter an account name');
      return;
    }
    
    const newAccount = {
      id: Date.now(),
      name: newAccountName,
      expenses: []
    };
    
    setAccounts([...accounts, newAccount]);
    setNewAccountName('');
    setShowAccountModal(false);
    setCurrentAccountId(newAccount.id);
  };

  const startEditAccountName = (account) => {
    setEditingAccountId(account.id);
    setEditingAccountName(account.name);
  };

  const saveAccountName = () => {
    if (!editingAccountName.trim()) {
      alert('Account name cannot be empty');
      return;
    }
    
    setAccounts(accounts.map(acc =>
      acc.id === editingAccountId
        ? { ...acc, name: editingAccountName }
        : acc
    ));
    setEditingAccountId(null);
    setEditingAccountName('');
  };

  const deleteAccount = (id) => {
    if (accounts.length === 1) {
      alert('Cannot delete the last account');
      return;
    }
    
    if (confirm('Are you sure you want to delete this account? All expenses will be lost.')) {
      setAccounts(accounts.filter(acc => acc.id !== id));
      if (currentAccountId === id) {
        setCurrentAccountId(accounts.find(acc => acc.id !== id).id);
      }
    }
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      } catch (error) {
        console.log('localStorage not available');
      }
    }
  };

  const exportAllData = () => {
    const dataStr = JSON.stringify(accounts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (confirm('This will replace all current data. Continue?')) {
            setAccounts(imported);
            setCurrentAccountId(imported[0]?.id || 1);
            alert('Data imported successfully!');
          }
        } catch (error) {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBulkImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const newExpenses = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const expense = {
            id: Date.now() + i,
            date: values[0] || new Date().toISOString().split('T')[0],
            category: values[1] || 'Other',
            description: values[2] || '',
            vendor: values[3] || '',
            vendorLocation: values[4]?.toLowerCase().includes('non-eu') ? 'non-eu' : 'eu',
            amount: parseFloat(values[5]) || 0,
            btw_rate: parseInt(values[6]) || 21,
            recurring: values[9] || 'one-time',
            paymentMethod: values[10] || 'Bank Transfer',
            notes: values[11] || ''
          };
          
          if (expense.description && expense.amount > 0) {
            newExpenses.push(expense);
          }
        }
        
        if (newExpenses.length > 0) {
          updateAccountExpenses([...newExpenses, ...expenses]);
          alert(`Successfully imported ${newExpenses.length} expenses!`);
          setShowBulkImport(false);
        } else {
          alert('No valid expenses found in CSV');
        }
      } catch (error) {
        alert('Error parsing CSV file. Please check the format.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (filters.category !== 'all' && exp.category !== filters.category) return false;
      if (filters.period !== 'all' && exp.recurring !== filters.period) return false;
      if (filters.startDate && exp.date < filters.startDate) return false;
      if (filters.endDate && exp.date > filters.endDate) return false;
      return true;
    });
  }, [expenses, filters]);

  const calculations = useMemo(() => {
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalBTW = filteredExpenses.reduce((sum, exp) => 
      sum + (exp.amount * exp.btw_rate / (100 + exp.btw_rate)), 0
    );
    const totalExBTW = total - totalBTW;
    
    const byCategory = categories.reduce((acc, cat) => {
      const catExpenses = filteredExpenses.filter(e => e.category === cat);
      acc[cat] = catExpenses.reduce((sum, e) => sum + e.amount, 0);
      return acc;
    }, {});

    const monthlyRecurring = filteredExpenses
      .filter(e => e.recurring === 'monthly')
      .reduce((sum, e) => sum + e.amount, 0);

    return { total, totalBTW, totalExBTW, byCategory, monthlyRecurring };
  }, [filteredExpenses]);

  const exportData = () => {
    const csv = [
      ['Date', 'Category', 'Description', 'Vendor', 'Vendor Location', 'Amount (incl BTW)', 'BTW Rate', 'BTW Amount', 'Amount (ex BTW)', 'Frequency', 'Payment Method', 'Notes'],
      ...filteredExpenses.map(exp => {
        const btwAmount = exp.amount * exp.btw_rate / (100 + exp.btw_rate);
        const exBTW = exp.amount - btwAmount;
        return [
          exp.date,
          exp.category,
          exp.description,
          exp.vendor,
          exp.vendorLocation === 'eu' ? 'EU' : 'Non-EU',
          exp.amount.toFixed(2),
          `${exp.btw_rate}%`,
          btwAmount.toFixed(2),
          exBTW.toFixed(2),
          exp.recurring,
          exp.paymentMethod || '',
          exp.notes || ''
        ];
      })
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAccount.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <Building2 className="text-indigo-600" size={32} />
              <div className="flex-1">
                {editingAccountId === currentAccountId ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingAccountName}
                      onChange={(e) => setEditingAccountName(e.target.value)}
                      className="text-2xl font-bold text-gray-900 border-b-2 border-indigo-600 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={saveAccountName}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Save size={20} />
                    </button>
                    <button
                      onClick={() => setEditingAccountId(null)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900">{currentAccount?.name}</h1>
                    <button
                      onClick={() => startEditAccountName(currentAccount)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    {dataStatus === 'saved' && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Database size={12} />
                        Saved
                      </span>
                    )}
                  </div>
                )}
                <p className="text-gray-600">BTW/VAT compliant expense management</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="px-3 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                title="Keyboard Shortcuts (⌘K)"
              >
                <Keyboard size={20} />
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'dashboard' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView('add')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'add' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Add Expense
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'list' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Expenses
              </button>
              <button
                onClick={() => setView('settings')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'settings' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Data
              </button>
            </div>
          </div>

          {/* Account Selector */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Accounts:</span>
            <div className="flex flex-wrap gap-2 flex-1">
              {accounts.map(account => (
                <div key={account.id} className="relative group">
                  <button
                    onClick={() => setCurrentAccountId(account.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      currentAccountId === account.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {account.name}
                    <span className="ml-2 text-xs opacity-75">({account.expenses.length})</span>
                  </button>
                  {accounts.length > 1 && (
                    <button
                      onClick={() => deleteAccount(account.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setShowAccountModal(true)}
                className="px-4 py-2 rounded-lg font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <Plus size={16} />
                New Account
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        {showKeyboardHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Keyboard size={24} />
                  Keyboard Shortcuts
                </h2>
                <button onClick={() => setShowKeyboardHelp(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">New Expense</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">⌘/Ctrl + N</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Dashboard</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">⌘/Ctrl + D</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">List View</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">⌘/Ctrl + L</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Export CSV</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">⌘/Ctrl + E</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">⌘/Ctrl + K</kbd>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Close Modals</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Import Modal */}
        {showBulkImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Bulk Import from CSV</h2>
                <button onClick={() => setShowBulkImport(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-gray-600 mb-2">CSV format should have these columns:</p>
                <code className="block bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  Date,Category,Description,Vendor,Vendor Location,Amount (incl BTW),BTW Rate,BTW Amount,Amount (ex BTW),Frequency,Payment Method,Notes
                </code>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleBulkImportCSV}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={20} />
                Choose CSV File
              </button>
            </div>
          </div>
        )}

        {/* Account Modal */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Account</h2>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Enter account name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={addAccount}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Create Account
                </button>
                <button
                  onClick={() => {
                    setShowAccountModal(false);
                    setNewAccountName('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings/Data Management View */}
        {view === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Database size={24} />
                Data Management
              </h2>
              <p className="text-gray-600 mb-6">
                Export, import, or clear your expense data. All data is stored locally in your browser.
              </p>

              <div className="space-y-4">
                <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
                  <h3 className="font-semibold text-indigo-900 mb-2">Bulk Import Expenses</h3>
                  <p className="text-sm text-indigo-700 mb-3">
                    Import multiple expenses at once from a CSV file. Great for migrating from other systems.
                  </p>
                  <button
                    onClick={() => setShowBulkImport(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Upload size={18} />
                    Bulk Import CSV
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Export All Data</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Download all accounts and expenses as a JSON backup file.
                  </p>
                  <button
                    onClick={exportAllData}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Download size={18} />
                    Export Backup
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Import Data</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Restore data from a previously exported JSON backup file.
                  </p>
                  <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 cursor-pointer inline-flex">
                    <Upload size={18} />
                    Import Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={importData}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-900 mb-2">Clear All Data</h3>
                  <p className="text-sm text-red-700 mb-3">
                    Permanently delete all accounts and expenses. This action cannot be undone.
                  </p>
                  <button
                    onClick={clearAllData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    Clear All Data
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Storage Information</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    Total Accounts: <span className="font-bold">{accounts.length}</span>
                  </p>
                  <p className="text-sm text-blue-700 mb-2">
                    Total Expenses: <span className="font-bold">{accounts.reduce((sum, acc) => sum + acc.expenses.length, 0)}</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-3">
                    Data is automatically saved to your browser's local storage.
                  </p>
                </div>

                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <h3 className="font-semibold text-purple-900 mb-2">🔮 Firebase Integration Ready</h3>
                  <p className="text-sm text-purple-700">
                    This app is structured for Firebase backend. Once deployed, you can add cloud sync, authentication, and cross-device access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Total (incl BTW)</span>
                  <TrendingUp className="text-indigo-600" size={20} />
                </div>
                <div className="text-2xl font-bold text-gray-900">€{calculations.total.toFixed(2)}</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Total BTW</span>
                  <FileText className="text-green-600" size={20} />
                </div>
                <div className="text-2xl font-bold text-gray-900">€{calculations.totalBTW.toFixed(2)}</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Total (ex BTW)</span>
                  <Calendar className="text-orange-600" size={20} />
                </div>
                <div className="text-2xl font-bold text-gray-900">€{calculations.totalExBTW.toFixed(2)}</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Monthly Recurring</span>
                  <Calendar className="text-purple-600" size={20} />
                </div>
                <div className="text-2xl font-bold text-gray-900">€{calculations.monthlyRecurring.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period Type</label>
                  <select
                    value={filters.period}
                    onChange={(e) => setFilters({...filters, period: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">All Periods</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setFilters({ category: 'all', period: 'all', startDate: '', endDate: '' })}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={exportData}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download size={18} />
                  Export to CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Breakdown by Category</h2>
              <div className="space-y-3">
                {categories.map(cat => {
                  const amount = calculations.byCategory[cat] || 0;
                  const percentage = calculations.total > 0 ? (amount / calculations.total * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{cat}</span>
                        <span className="text-sm font-bold text-gray-900">€{amount.toFixed(2)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Add Expense View */}
        {view === 'add' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Expense</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor * 
                    {vendorHistory.length > 0 && <span className="text-xs text-gray-500 ml-2">(Type to see suggestions)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={vendorInput}
                      onChange={(e) => {
                        setVendorInput(e.target.value);
                        setShowVendorSuggestions(true);
                      }}
                      onFocus={() => setShowVendorSuggestions(true)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., GitHub Inc."
                    />
                    {showVendorSuggestions && vendorSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {vendorSuggestions.map((vendor, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectVendor(vendor)}
                            className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">{vendor.name}</span>
                              <span className="text-xs text-gray-500">€{vendor.lastAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${vendor.vendorLocation === 'eu' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {vendor.vendorLocation === 'eu' ? 'EU' : 'Non-EU'}
                              </span>
                              <span className="text-xs text-gray-500">{vendor.lastPaymentMethod}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Location *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, vendorLocation: 'eu'})}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.vendorLocation === 'eu'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <MapPin size={16} />
                      EU (BTW applies)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, vendorLocation: 'non-eu'})}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.vendorLocation === 'non-eu'
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <MapPin size={16} />
                      Non-EU (No BTW)
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., GitHub Enterprise License"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (incl. BTW) € *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">BTW Rate *</label>
                  <select
                    value={formData.btw_rate}
                    onChange={(e) => setFormData({...formData, btw_rate: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={formData.vendorLocation === 'non-eu'}
                  >
                    {btw_rates.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                  {formData.vendorLocation === 'non-eu' && (
                    <p className="text-xs text-gray-500 mt-1">BTW automatically set to 0% for Non-EU vendors</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['monthly', 'quarterly', 'yearly', 'one-time'].map(freq => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFormData({...formData, recurring: freq})}
                        className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                          formData.recurring === freq
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Add any additional notes..."
                    rows="3"
                  />
                </div>
              </div>
              
              {formData.amount && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <h3 className="font-semibold text-indigo-900 mb-2">BTW Calculation</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-indigo-700">Amount incl. BTW:</span>
                      <div className="font-bold text-indigo-900">€{parseFloat(formData.amount || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-indigo-700">BTW ({formData.btw_rate}%):</span>
                      <div className="font-bold text-indigo-900">
                        €{(parseFloat(formData.amount || 0) * formData.btw_rate / (100 + formData.btw_rate)).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-indigo-700">Amount ex. BTW:</span>
                      <div className="font-bold text-indigo-900">
                        €{(parseFloat(formData.amount || 0) - (parseFloat(formData.amount || 0) * formData.btw_rate / (100 + formData.btw_rate))).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={addExpense}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle size={20} />
                Add Expense
              </button>
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">All Expenses ({filteredExpenses.length})</h2>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={18} />
                Export
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Vendor</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">BTW</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Payment</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Frequency</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp, idx) => (
                    <React.Fragment key={exp.id}>
                      {editingExpense?.id === exp.id ? (
                        <tr className="bg-indigo-50 border-b border-indigo-200">
                          <td className="py-3 px-4">
                            <input
                              type="date"
                              value={editingExpense.date}
                              onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={editingExpense.category}
                              onChange={(e) => setEditingExpense({...editingExpense, category: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editingExpense.description}
                              onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editingExpense.vendor}
                              onChange={(e) => setEditingExpense({...editingExpense, vendor: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              step="0.01"
                              value={editingExpense.amount}
                              onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={editingExpense.btw_rate}
                              onChange={(e) => setEditingExpense({...editingExpense, btw_rate: parseInt(e.target.value)})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {btw_rates.map(rate => (
                                <option key={rate} value={rate}>{rate}%</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={editingExpense.paymentMethod || 'Bank Transfer'}
                              onChange={(e) => setEditingExpense({...editingExpense, paymentMethod: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {paymentMethods.map(method => (
                                <option key={method} value={method}>{method}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={editingExpense.recurring}
                              onChange={(e) => setEditingExpense({...editingExpense, recurring: e.target.value})}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="quarterly">Yearly</option>
                              <option value="one-time">One-time</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={saveEditExpense}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={() => setEditingExpense(null)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="py-3 px-4 text-sm text-gray-900">{exp.date}</td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900">{exp.description}</div>
                            {exp.notes && (
                              <div className="text-xs text-gray-500 mt-1 italic">{exp.notes}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900">{exp.vendor}</div>
                            <span className={`text-xs px-2 py-0.5 rounded ${exp.vendorLocation === 'eu' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {exp.vendorLocation === 'eu' ? 'EU' : 'Non-EU'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">€{exp.amount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              {exp.btw_rate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-xs text-gray-600">{exp.paymentMethod || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium capitalize">
                              {exp.recurring}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => duplicateExpense(exp)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Duplicate"
                              >
                                <Copy size={18} />
                              </button>
                              <button
                                onClick={() => startEditExpense(exp)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => setDeletingExpenseId(exp.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredExpenses.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No expenses found. Add your first expense to get started!
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingExpenseId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Deletion</h2>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this expense? This action cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteExpense(deletingExpenseId)}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeletingExpenseId(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;