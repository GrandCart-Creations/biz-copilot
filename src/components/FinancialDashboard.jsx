/**
 * FINANCIAL DASHBOARD
 * 
 * Unified dashboard that aggregates all financial data sources:
 * - Expenses
 * - Income
 * - Financial Accounts
 * - Funding
 * - Investors
 * 
 * Provides real-time insights, trends, and actionable information for Owners
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import {
  getCompanyExpenses,
  getCompanyIncome,
  getCompanyFinancialAccounts,
  getCompanyFunding,
  getCompanyInvestors
} from '../firebase';
import {
  FaChartLine,
  FaDollarSign,
  FaArrowUp,
  FaArrowDown,
  FaUniversity,
  FaSeedling,
  FaUserTie,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaCalendarAlt,
  FaArrowLeft,
  FaWallet,
  FaChartBar,
  FaPercentage
} from 'react-icons/fa';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';

const FinancialDashboard = () => {
  const navigate = useNavigate();
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);
  
  // Data State
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [funding, setFunding] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Period Filter
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'year', 'all'
  
  // Load all data
  const loadAllData = async () => {
    if (!currentCompanyId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const [expensesData, incomeData, accountsData, fundingData, investorsData] = await Promise.all([
        getCompanyExpenses(currentCompanyId).catch(err => {
          console.error('Error loading expenses:', err);
          return [];
        }),
        getCompanyIncome(currentCompanyId).catch(err => {
          console.error('Error loading income:', err);
          return [];
        }),
        getCompanyFinancialAccounts(currentCompanyId).catch(err => {
          console.error('Error loading accounts:', err);
          return [];
        }),
        getCompanyFunding(currentCompanyId).catch(err => {
          console.error('Error loading funding:', err);
          return [];
        }),
        getCompanyInvestors(currentCompanyId).catch(err => {
          console.error('Error loading investors:', err);
          return [];
        })
      ]);
      
      setExpenses(expensesData || []);
      setIncome(incomeData || []);
      setAccounts(accountsData || []);
      setFunding(fundingData || []);
      setInvestors(investorsData || []);
    } catch (error) {
      console.error('Error loading financial data:', error);
      setError(error.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };
  
  // Load all data when company changes
  useEffect(() => {
    if (currentCompanyId) {
      loadAllData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompanyId]);
  
  // Get date range for period
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (period) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return { start: weekAgo.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return { start: monthAgo.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        return { start: yearAgo.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      default:
        return { start: '', end: '' };
    }
  };
  
  // Filter data by period
  const filteredExpenses = useMemo(() => {
    if (period === 'all') return expenses;
    const { start, end } = getDateRange();
    return expenses.filter(exp => {
      if (start && exp.date < start) return false;
      if (end && exp.date > end) return false;
      return true;
    });
  }, [expenses, period]);
  
  const filteredIncome = useMemo(() => {
    if (period === 'all') return income;
    const { start, end } = getDateRange();
    return income.filter(inc => {
      if (start && inc.date < start) return false;
      if (end && inc.date > end) return false;
      return true;
    });
  }, [income, period]);
  
  // Calculate Key Metrics
  const analyticsExpenses = useMemo(() => {
    return filteredExpenses.filter((exp) => {
      const docType = (exp.documentType || '').toLowerCase();
      if (docType === 'receipt' && exp.linkedInvoiceExpenseId) {
        return false;
      }
      if (docType === 'statement' && exp.linkedReceiptExpenseId) {
        return false;
      }
      return true;
    });
  }, [filteredExpenses]);

  const metrics = useMemo(() => {
    const totalExpenses = analyticsExpenses.reduce((sum, exp) => {
      const amount = parseFloat(exp.amount);
      if (!Number.isFinite(amount)) return sum;
      return sum + amount;
    }, 0);
    
    const totalIncome = filteredIncome.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
    
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    
    const totalExpenseVAT = analyticsExpenses.reduce((sum, exp) => {
      const amount = parseFloat(exp.amount);
      if (!Number.isFinite(amount)) return sum;
      const vatRate = parseFloat(exp.btw || 0) / 100;
      return sum + (amount * vatRate);
    }, 0);
    
    const totalIncomeVAT = filteredIncome.reduce((sum, inc) => {
      const amount = parseFloat(inc.amount) || 0;
      const vatRate = parseFloat(inc.btw || 0) / 100;
      return sum + (amount * vatRate);
    }, 0);
    
    const netVAT = totalIncomeVAT - totalExpenseVAT;
    
    const totalAccountBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.currentBalance) || 0), 0);
    const totalFunding = funding.filter(f => f.status === 'active').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    const totalInvestments = investors.reduce((sum, inv) => sum + (parseFloat(inv.totalInvested) || 0), 0);
    
    return {
      totalExpenses,
      totalIncome,
      netProfit,
      profitMargin,
      totalExpenseVAT,
      totalIncomeVAT,
      netVAT,
      totalAccountBalance,
      totalFunding,
      totalInvestments,
      expenseCount: analyticsExpenses.length,
      incomeCount: filteredIncome.length,
      accountCount: accounts.length,
      investorCount: investors.length
    };
  }, [filteredExpenses, filteredIncome, accounts, funding, investors]);
  
  // Calculate trends (compare with previous period)
  const trends = useMemo(() => {
    const getPreviousPeriodData = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let prevStart, prevEnd, currentStart, currentEnd;
      
      switch (period) {
        case 'week':
          currentStart = new Date(today);
          currentStart.setDate(today.getDate() - 7);
          currentEnd = today;
          prevStart = new Date(currentStart);
          prevStart.setDate(currentStart.getDate() - 7);
          prevEnd = currentStart;
          break;
        case 'month':
          currentStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          currentEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          prevStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          prevEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
          break;
        case 'year':
          currentStart = new Date(today.getFullYear() - 1, 0, 1);
          currentEnd = new Date(today.getFullYear() - 1, 11, 31);
          prevStart = new Date(today.getFullYear() - 2, 0, 1);
          prevEnd = new Date(today.getFullYear() - 2, 11, 31);
          break;
        default:
          return { prevIncome: 0, prevExpenses: 0 };
      }
      
      const prevExpenses = expenses
        .filter(exp => exp.date >= prevStart.toISOString().split('T')[0] && exp.date <= prevEnd.toISOString().split('T')[0])
        .reduce((sum, exp) => {
          const docType = (exp.documentType || '').toLowerCase();
          if (docType === 'receipt' && exp.linkedInvoiceExpenseId) {
            return sum;
          }
          if (docType === 'statement' && exp.linkedReceiptExpenseId) {
            return sum;
          }
          const amount = parseFloat(exp.amount);
          if (!Number.isFinite(amount)) return sum;
          return sum + amount;
        }, 0);
      
      const prevIncome = income
        .filter(inc => inc.date >= prevStart.toISOString().split('T')[0] && inc.date <= prevEnd.toISOString().split('T')[0])
        .reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
      
      return { prevIncome, prevExpenses };
    };
    
    if (period === 'all') {
      return { incomeChange: 0, expenseChange: 0, incomePercent: 0, expensePercent: 0 };
    }
    
    const { prevIncome, prevExpenses } = getPreviousPeriodData();
    const incomeChange = metrics.totalIncome - prevIncome;
    const expenseChange = metrics.totalExpenses - prevExpenses;
    const incomePercent = prevIncome > 0 ? (incomeChange / prevIncome) * 100 : 0;
    const expensePercent = prevExpenses > 0 ? (expenseChange / prevExpenses) * 100 : 0;
    
    return { incomeChange, expenseChange, incomePercent, expensePercent };
  }, [period, expenses, income, metrics]);
  
  // Helper functions (must be defined before useMemo hooks that use them)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Get insights
  const insights = useMemo(() => {
    const insightsList = [];
    
    // Profitability
    if (metrics.netProfit < 0) {
      insightsList.push({
        type: 'warning',
        icon: FaExclamationTriangle,
        title: 'Negative Profit',
        message: `Your company is operating at a loss of ${formatCurrency(Math.abs(metrics.netProfit))} for this period.`,
        action: 'Review expenses and revenue streams.'
      });
    } else if (metrics.profitMargin < 10) {
      insightsList.push({
        type: 'info',
        icon: FaInfoCircle,
        title: 'Low Profit Margin',
        message: `Profit margin is ${metrics.profitMargin.toFixed(1)}%. Consider optimizing costs.`,
        action: 'Review expense categories.'
      });
    } else {
      insightsList.push({
        type: 'success',
        icon: FaCheckCircle,
        title: 'Healthy Profitability',
        message: `You're maintaining a ${metrics.profitMargin.toFixed(1)}% profit margin.`,
        action: 'Great work!'
      });
    }
    
    // Cash Flow
    if (metrics.totalAccountBalance < metrics.totalExpenses) {
      insightsList.push({
        type: 'warning',
        icon: FaExclamationTriangle,
        title: 'Low Cash Balance',
        message: `Account balance (${formatCurrency(metrics.totalAccountBalance)}) is lower than monthly expenses.`,
        action: 'Monitor cash flow closely.'
      });
    }
    
    // VAT
    if (metrics.netVAT > 1000) {
      insightsList.push({
        type: 'info',
        icon: FaInfoCircle,
        title: 'VAT Payment Due',
        message: `You owe ${formatCurrency(metrics.netVAT)} in VAT for this period.`,
        action: 'Prepare for quarterly VAT submission.'
      });
    }
    
    // Trends
    if (trends.incomePercent < -10) {
      insightsList.push({
        type: 'warning',
        icon: FaArrowDown,
        title: 'Declining Revenue',
        message: `Income decreased by ${Math.abs(trends.incomePercent).toFixed(1)}% compared to last period.`,
        action: 'Analyze revenue sources.'
      });
    } else if (trends.incomePercent > 10) {
      insightsList.push({
        type: 'success',
        icon: FaArrowUp,
        title: 'Growing Revenue',
        message: `Income increased by ${trends.incomePercent.toFixed(1)}% compared to last period!`,
        action: 'Maintain this momentum.'
      });
    }
    
    return insightsList;
  }, [metrics, trends]);
  
  // Get recent transactions
  const recentTransactions = useMemo(() => {
    const all = [
      ...expenses.slice(0, 5).map(exp => ({
        type: 'expense',
        date: exp.date,
        amount: -parseFloat(exp.amount || 0),
        description: exp.description || exp.vendor || 'Expense',
        category: exp.category
      })),
      ...income.slice(0, 5).map(inc => ({
        type: 'income',
        date: inc.date,
        amount: parseFloat(inc.amount || 0),
        description: inc.description || inc.source || 'Income',
        category: inc.category
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    
    return all;
  }, [expenses, income]);
  
  // Expense by category
  const expensesByCategory = useMemo(() => {
    const categoryMap = {};
    filteredExpenses.forEach(exp => {
      const category = exp.category || 'Other';
      const amount = parseFloat(exp.amount) || 0;
      if (typeof amount === 'string' && exp.amount_encrypted) return;
      categoryMap[category] = (categoryMap[category] || 0) + amount;
    });
    return Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);
  
  // Income by source
  const incomeBySource = useMemo(() => {
    const sourceMap = {};
    filteredIncome.forEach(inc => {
      const source = inc.source || 'Other';
      const amount = parseFloat(inc.amount) || 0;
      sourceMap[source] = (sourceMap[source] || 0) + amount;
    });
    return Object.entries(sourceMap)
      .map(([source, amount]) => ({ source, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredIncome]);
  
  // Monthly cash flow data
  const monthlyCashFlow = useMemo(() => {
    const monthlyData = {};
    
    [...filteredIncome, ...filteredExpenses].forEach(item => {
      if (!item.date) return;
      const month = item.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }
      
      const amount = parseFloat(item.amount || 0);
      if (typeof amount === 'string' && item.amount_encrypted) return;
      
      if (item.type === 'income' || income.some(inc => inc.id === item.id)) {
        monthlyData[month].income += amount;
      } else {
        monthlyData[month].expenses += amount;
      }
    });
    
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }, [filteredIncome, filteredExpenses, income, expenses]);
  
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
            <FaChartLine className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Company Selected</h2>
            <p className="text-gray-600">Please select a company to view financial insights.</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        <header className="bg-white shadow-sm border-b w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ModuleNavigationButton currentModuleId="financialDashboard" />
                <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
              </div>
              <div className="flex items-center gap-4">
                <CompanySelector />
                <UserProfile />
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Error Loading Dashboard</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={loadAllData}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Check if owner
  const isOwner = userRole === 'owner';
  
  return (
    <div className="w-full">
      {/* Period Selector - moved to content area */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-end">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Net Profit */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Net Profit</p>
                <p className={`text-3xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.netProfit)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${metrics.netProfit >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                {metrics.netProfit >= 0 ? (
                  <FaArrowUp className="w-6 h-6 text-green-600" />
                ) : (
                  <FaArrowDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FaPercentage className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Margin: {metrics.profitMargin.toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Total Income */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">Total Income</p>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(metrics.totalIncome)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
                <FaDollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {trends.incomePercent !== 0 && (
                <>
                  {trends.incomePercent > 0 ? (
                    <FaArrowUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <FaArrowDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={trends.incomePercent > 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(trends.incomePercent).toFixed(1)}% vs last period
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Total Expenses */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl shadow-lg p-6 border border-red-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-red-700 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center">
                <FaChartBar className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">{metrics.expenseCount} transactions</span>
            </div>
          </div>
          
          {/* Account Balance */}
          <div className="bg-gradient-to-br from-[#F0FBF8] to-[#EAF4F6] rounded-xl shadow-lg p-6 border border-[#B8E5DC]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-[#2F6F63] mb-1">Total Balance</p>
                <p className="text-3xl font-bold" style={{ color: accentColor }}>
                  {formatCurrency(metrics.totalAccountBalance)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#D4F5EF' }}>
                <FaWallet className="w-6 h-6" style={{ color: accentColor }} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">{metrics.accountCount} accounts</span>
            </div>
          </div>
        </div>
        
        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 mb-1">VAT Owed</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(metrics.netVAT)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 mb-1">Active Funding</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(metrics.totalFunding)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 mb-1">Investor Capital</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(metrics.totalInvestments)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 mb-1">Total Transactions</p>
            <p className="text-xl font-bold text-gray-900">{metrics.expenseCount + metrics.incomeCount}</p>
          </div>
        </div>
        
        {/* Insights & Alerts */}
        {insights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaInfoCircle className="w-5 h-5 text-blue-600" />
              Key Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div
                    key={index}
                    className={`rounded-lg p-4 border-l-4 ${
                      insight.type === 'success'
                        ? 'bg-green-50 border-green-400'
                        : insight.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-blue-50 border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`w-5 h-5 mt-0.5 ${
                          insight.type === 'success'
                            ? 'text-green-600'
                            : insight.type === 'warning'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
                        <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                        <p className="text-xs text-gray-500 italic">{insight.action}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cash Flow Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Trend</h3>
            {monthlyCashFlow.length > 0 ? (
              <div className="space-y-3">
                {monthlyCashFlow.map((monthData, index) => {
                  const maxValue = Math.max(
                    ...monthlyCashFlow.map(m => Math.max(Math.abs(m.income), Math.abs(m.expenses)))
                  );
                  const incomeWidth = maxValue > 0 ? (monthData.income / maxValue) * 100 : 0;
                  const expenseWidth = maxValue > 0 ? (monthData.expenses / maxValue) * 100 : 0;
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{new Date(monthData.month + '-01').toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })}</span>
                        <span className="font-semibold">{formatCurrency(monthData.net)}</span>
                      </div>
                      <div className="flex gap-2 h-6">
                        <div
                          className="bg-green-500 rounded-l flex items-center justify-end pr-2 text-white text-xs font-medium"
                          style={{ width: `${incomeWidth}%` }}
                        >
                          {monthData.income > maxValue * 0.1 && formatCurrency(monthData.income)}
                        </div>
                        <div
                          className="bg-red-500 rounded-r flex items-center justify-start pl-2 text-white text-xs font-medium"
                          style={{ width: `${expenseWidth}%` }}
                        >
                          {monthData.expenses > maxValue * 0.1 && formatCurrency(monthData.expenses)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaChartLine className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No data available for selected period</p>
              </div>
            )}
          </div>
          
          {/* Expenses by Category */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
            {expensesByCategory.length > 0 ? (
              <div className="space-y-3">
                {expensesByCategory.slice(0, 6).map((item, index) => {
                  const maxExpense = Math.max(...expensesByCategory.map(e => e.amount));
                  const width = maxExpense > 0 ? (item.amount / maxExpense) * 100 : 0;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.category}</span>
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaChartBar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No expense data available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Income Sources & Financial Accounts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Income by Source */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Income by Source</h3>
            {incomeBySource.length > 0 ? (
              <div className="space-y-3">
                {incomeBySource.slice(0, 6).map((item, index) => {
                  const maxIncome = Math.max(...incomeBySource.map(i => i.amount));
                  const width = maxIncome > 0 ? (item.amount / maxIncome) * 100 : 0;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.source}</span>
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaDollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No income data available</p>
              </div>
            )}
          </div>
          
          {/* Financial Accounts Summary */}
          {isOwner && accounts.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Balances</h3>
              <div className="space-y-3">
                {accounts.slice(0, 6).map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FaUniversity className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{account.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{account.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold ${
                      account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {new Intl.NumberFormat('nl-NL', {
                        style: 'currency',
                        currency: account.currency || 'EUR'
                      }).format(account.currentBalance || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Funding & Investors Summary */}
        {(funding.length > 0 || investors.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Funding Summary */}
            {funding.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaSeedling className="w-5 h-5 text-green-600" />
                  Funding Sources
                </h3>
                <div className="space-y-3">
                  {funding.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{item.type.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">{formatCurrency(item.amount, item.currency)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.status === 'active' ? 'bg-green-100 text-green-700' :
                          item.status === 'repaid' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Investors Summary */}
            {investors.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaUserTie className="w-5 h-5" style={{ color: accentColor }} />
                  Investors
                </h3>
                <div className="space-y-3">
                  {investors.slice(0, 5).map((investor) => (
                    <div key={investor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{investor.name}</p>
                        <p className="text-xs text-gray-500">{investor.type} Investor</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">{formatCurrency(investor.totalInvested, investor.currency)}</p>
                        {investor.equityPercentage > 0 && (
                          <p className="text-xs text-gray-500">{investor.equityPercentage}% equity</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaCalendarAlt className="w-5 h-5 text-gray-600" />
            Recent Transactions
          </h3>
          {recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.map((transaction, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          transaction.type === 'income'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {transaction.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {transaction.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {transaction.category}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-right ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FaCalendarAlt className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent transactions</p>
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/modules/expenses')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 transition-colors flex items-center justify-center gap-2"
          >
            <FaChartBar />
            View Expenses
          </button>
          <button
            onClick={() => navigate('/modules/income')}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 transition-colors flex items-center justify-center gap-2"
          >
            <FaDollarSign />
            View Income
          </button>
          <button
            onClick={() => navigate('/modules/settings')}
            className="bg-[#00BFA6] hover:bg-[#019884] text-white rounded-lg p-4 transition-colors flex items-center justify-center gap-2"
          >
            <FaUniversity />
            Manage Accounts
          </button>
          <button
            onClick={() => navigate('/modules/reports')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-4 transition-colors flex items-center justify-center gap-2"
          >
            <FaChartLine />
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;

