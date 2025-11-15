/**
 * REPORTS & ANALYTICS DASHBOARD
 * 
 * Comprehensive financial reporting and analytics module
 * - Profit & Loss (P&L) Statement
 * - Cash Flow Statement
 * - Expense Analytics with visualizations
 * - Income Analytics with visualizations
 * - Export capabilities (PDF, Excel, CSV)
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
  FaFileAlt,
  FaChartBar,
  FaDownload,
  FaChartPie,
  FaFileExcel,
  FaFilePdf,
  FaDollarSign,
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt
} from 'react-icons/fa';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';
import {
  getCompanyExpenses,
  getCompanyIncome,
  getCompanyInvoices
} from '../firebase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { generateReportPDF } from '../utils/reportGenerator';
import * as XLSX from 'xlsx';

const ReportsDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profitLoss'); // 'profitLoss', 'cashFlow', 'expenseAnalytics', 'incomeAnalytics'
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'quarter', 'year', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Data
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);

  // Load all data
  useEffect(() => {
    if (!currentCompanyId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [expensesData, incomeData, invoicesData] = await Promise.all([
          getCompanyExpenses(currentCompanyId).catch(() => []),
          getCompanyIncome(currentCompanyId).catch(() => []),
          getCompanyInvoices(currentCompanyId).catch(() => [])
        ]);
        
        setExpenses(expensesData || []);
        setIncome(incomeData || []);
        setInvoices(invoicesData || []);
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentCompanyId]);

  // Get date range for selected period
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (period === 'custom') {
      return {
        start: customStartDate ? new Date(customStartDate) : null,
        end: customEndDate ? new Date(customEndDate + 'T23:59:59') : null
      };
    }
    
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    
    switch (period) {
      case 'week':
        start.setDate(today.getDate() - 7);
        return { start, end: today };
      case 'month':
        start.setMonth(today.getMonth() - 1);
        return { start, end: today };
      case 'quarter':
        start.setMonth(today.getMonth() - 3);
        return { start, end: today };
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        return { start, end: today };
      default:
        return { start: null, end: null };
    }
  }, [period, customStartDate, customEndDate]);

  // Filter data by date range
  const filteredExpenses = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return expenses;
    
    return expenses.filter(exp => {
      const expDate = exp.date ? new Date(exp.date) : null;
      if (!expDate) return false;
      
      // Exclude linked receipts/statements to avoid double-counting
      const docType = (exp.documentType || '').toLowerCase();
      if (docType === 'receipt' && exp.linkedInvoiceExpenseId) return false;
      if (docType === 'statement' && exp.linkedReceiptExpenseId) return false;
      
      return expDate >= dateRange.start && expDate <= dateRange.end;
    });
  }, [expenses, dateRange]);

  const filteredIncome = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return income;
    
    return income.filter(inc => {
      const incDate = inc.date ? new Date(inc.date) : null;
      if (!incDate) return false;
      return incDate >= dateRange.start && incDate <= dateRange.end;
    });
  }, [income, dateRange]);

  const filteredInvoices = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return invoices;
    
    return invoices.filter(inv => {
      const invDate = inv.invoiceDate?.toDate ? inv.invoiceDate.toDate() : 
                     (inv.invoiceDate ? new Date(inv.invoiceDate) : null);
      if (!invDate) return false;
      return invDate >= dateRange.start && invDate <= dateRange.end;
    });
  }, [invoices, dateRange]);

  // Calculate Profit & Loss metrics
  const profitLossData = useMemo(() => {
    const totalRevenue = filteredIncome.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    // Calculate VAT
    const revenueVAT = filteredIncome.reduce((sum, inc) => {
      const amount = parseFloat(inc.amount) || 0;
      const vatRate = parseFloat(inc.btw || 0) / 100;
      return sum + (amount * vatRate);
    }, 0);
    
    const expenseVAT = filteredExpenses.reduce((sum, exp) => {
      const amount = parseFloat(exp.amount) || 0;
      const vatRate = parseFloat(exp.btw || 0) / 100;
      return sum + (amount * vatRate);
    }, 0);
    
    const netRevenue = totalRevenue - revenueVAT;
    const netExpenses = totalExpenses - expenseVAT;
    const grossProfit = netRevenue - netExpenses;
    const netVAT = revenueVAT - expenseVAT;
    const netProfit = grossProfit - netVAT;
    
    return {
      totalRevenue,
      revenueVAT,
      netRevenue,
      totalExpenses,
      expenseVAT,
      netExpenses,
      grossProfit,
      netVAT,
      netProfit,
      profitMargin: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0
    };
  }, [filteredIncome, filteredExpenses]);

  // Calculate Cash Flow
  const cashFlowData = useMemo(() => {
    // Operating Activities
    const operatingIncome = filteredIncome
      .filter(inc => inc.paymentStatus !== 'pending')
      .reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
    
    const operatingExpenses = filteredExpenses
      .filter(exp => exp.paymentStatus === 'paid')
      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    const operatingCashFlow = operatingIncome - operatingExpenses;
    
    // Accounts Receivable (unpaid invoices)
    const accountsReceivable = filteredInvoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    
    // Accounts Payable (unpaid expenses)
    const accountsPayable = filteredExpenses
      .filter(exp => exp.paymentStatus === 'open' || exp.paymentStatus === 'pending')
      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    const netCashFlow = operatingCashFlow - accountsPayable + accountsReceivable;
    
    return {
      operatingIncome,
      operatingExpenses,
      operatingCashFlow,
      accountsReceivable,
      accountsPayable,
      netCashFlow
    };
  }, [filteredIncome, filteredExpenses, filteredInvoices]);

  // Expense Analytics - Category Breakdown
  const expenseCategoryData = useMemo(() => {
    const categoryMap = new Map();
    
    filteredExpenses.forEach(exp => {
      const category = exp.category || 'Other';
      const amount = parseFloat(exp.amount) || 0;
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Expense Analytics - Vendor Breakdown
  const expenseVendorData = useMemo(() => {
    const vendorMap = new Map();
    
    filteredExpenses.forEach(exp => {
      const vendor = exp.vendor || 'Unknown';
      const amount = parseFloat(exp.amount) || 0;
      vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + amount);
    });
    
    return Array.from(vendorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 vendors
  }, [filteredExpenses]);

  // Expense Analytics - Monthly Trends
  const expenseTrendData = useMemo(() => {
    const monthMap = new Map();
    
    filteredExpenses.forEach(exp => {
      const date = exp.date ? new Date(exp.date) : null;
      if (!date) return;
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(exp.amount) || 0;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);
    });
    
    return Array.from(monthMap.entries())
      .map(([month, value]) => ({ month, expenses: value }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredExpenses]);

  // Income Analytics - Source Breakdown
  const incomeSourceData = useMemo(() => {
    const sourceMap = new Map();
    
    filteredIncome.forEach(inc => {
      const source = inc.source || 'Other';
      const amount = parseFloat(inc.amount) || 0;
      sourceMap.set(source, (sourceMap.get(source) || 0) + amount);
    });
    
    return Array.from(sourceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredIncome]);

  // Income Analytics - Customer Breakdown
  const incomeCustomerData = useMemo(() => {
    const customerMap = new Map();
    
    filteredIncome.forEach(inc => {
      const customer = inc.customer || 'Unknown';
      const amount = parseFloat(inc.amount) || 0;
      customerMap.set(customer, (customerMap.get(customer) || 0) + amount);
    });
    
    return Array.from(customerMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 customers
  }, [filteredIncome]);

  // Income Analytics - Monthly Trends
  const incomeTrendData = useMemo(() => {
    const monthMap = new Map();
    
    filteredIncome.forEach(inc => {
      const date = inc.date ? new Date(inc.date) : null;
      if (!date) return;
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(inc.amount) || 0;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);
    });
    
    return Array.from(monthMap.entries())
      .map(([month, value]) => ({ month, income: value }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredIncome]);

  // Combined trend data for comparison
  const combinedTrendData = useMemo(() => {
    const monthMap = new Map();
    
    // Add expense months
    expenseTrendData.forEach(item => {
      monthMap.set(item.month, { month: item.month, expenses: item.expenses, income: 0 });
    });
    
    // Add income months
    incomeTrendData.forEach(item => {
      if (monthMap.has(item.month)) {
        monthMap.get(item.month).income = item.income;
      } else {
        monthMap.set(item.month, { month: item.month, expenses: 0, income: item.income });
      }
    });
    
    return Array.from(monthMap.values())
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [expenseTrendData, incomeTrendData]);

  // Chart colors
  const CHART_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
    '#6366F1'  // Indigo
  ];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  // Export functions
  const handleExportPDF = () => {
    const reportData = {
      profitLoss: profitLossData,
      cashFlow: cashFlowData,
      expenseCategory: expenseCategoryData,
      incomeSource: incomeSourceData,
      period,
      company: currentCompany
    };
    
    generateReportPDF(reportData, activeTab);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    if (activeTab === 'profitLoss') {
      const ws = XLSX.utils.json_to_sheet([
        { Item: 'Total Revenue', Amount: profitLossData.totalRevenue },
        { Item: 'Revenue VAT', Amount: profitLossData.revenueVAT },
        { Item: 'Net Revenue', Amount: profitLossData.netRevenue },
        { Item: 'Total Expenses', Amount: profitLossData.totalExpenses },
        { Item: 'Expense VAT', Amount: profitLossData.expenseVAT },
        { Item: 'Net Expenses', Amount: profitLossData.netExpenses },
        { Item: 'Gross Profit', Amount: profitLossData.grossProfit },
        { Item: 'Net VAT', Amount: profitLossData.netVAT },
        { Item: 'Net Profit', Amount: profitLossData.netProfit },
        { Item: 'Profit Margin (%)', Amount: profitLossData.profitMargin }
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');
    } else if (activeTab === 'cashFlow') {
      const ws = XLSX.utils.json_to_sheet([
        { Item: 'Operating Income', Amount: cashFlowData.operatingIncome },
        { Item: 'Operating Expenses', Amount: cashFlowData.operatingExpenses },
        { Item: 'Operating Cash Flow', Amount: cashFlowData.operatingCashFlow },
        { Item: 'Accounts Receivable', Amount: cashFlowData.accountsReceivable },
        { Item: 'Accounts Payable', Amount: cashFlowData.accountsPayable },
        { Item: 'Net Cash Flow', Amount: cashFlowData.netCashFlow }
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    }
    
    XLSX.writeFile(wb, `Report_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportCSV = () => {
    let csvData = [];
    
    if (activeTab === 'profitLoss') {
      csvData = [
        ['Item', 'Amount'],
        ['Total Revenue', profitLossData.totalRevenue],
        ['Revenue VAT', profitLossData.revenueVAT],
        ['Net Revenue', profitLossData.netRevenue],
        ['Total Expenses', profitLossData.totalExpenses],
        ['Expense VAT', profitLossData.expenseVAT],
        ['Net Expenses', profitLossData.netExpenses],
        ['Gross Profit', profitLossData.grossProfit],
        ['Net VAT', profitLossData.netVAT],
        ['Net Profit', profitLossData.netProfit],
        ['Profit Margin (%)', profitLossData.profitMargin]
      ];
    } else if (activeTab === 'cashFlow') {
      csvData = [
        ['Item', 'Amount'],
        ['Operating Income', cashFlowData.operatingIncome],
        ['Operating Expenses', cashFlowData.operatingExpenses],
        ['Operating Cash Flow', cashFlowData.operatingCashFlow],
        ['Accounts Receivable', cashFlowData.accountsReceivable],
        ['Accounts Payable', cashFlowData.accountsPayable],
        ['Net Cash Flow', cashFlowData.netCashFlow]
      ];
    }
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 w-full">
        <header className="bg-white shadow-sm border-b w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ModuleNavigationButton currentModuleId="reports" />
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                  <FaFileAlt className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
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
              <ModuleNavigationButton currentModuleId="reports" />
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                <FaFileAlt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
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
        {/* Period Selector & Export Buttons */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Period:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
              
              {period === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                    placeholder="Start Date"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                    placeholder="End Date"
                  />
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
              >
                <FaFilePdf className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <FaFileExcel className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              >
                <FaDownload className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'profitLoss', label: 'Profit & Loss', icon: FaChartBar },
                { id: 'cashFlow', label: 'Cash Flow', icon: FaDollarSign },
                { id: 'expenseAnalytics', label: 'Expense Analytics', icon: FaChartPie },
                { id: 'incomeAnalytics', label: 'Income Analytics', icon: FaArrowUp }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Profit & Loss Tab */}
          {activeTab === 'profitLoss' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <FaArrowUp className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(profitLossData.totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <FaArrowDown className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(profitLossData.totalExpenses)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Gross Profit</p>
                    <FaDollarSign className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(profitLossData.grossProfit)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <FaChartBar className="w-5 h-5" style={{ color: profitLossData.netProfit >= 0 ? '#10B981' : '#EF4444' }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: profitLossData.netProfit >= 0 ? '#10B981' : '#EF4444' }}>
                    {formatCurrency(profitLossData.netProfit)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Margin: {profitLossData.profitMargin.toFixed(1)}%</p>
                </div>
              </div>

              {/* P&L Statement Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Profit & Loss Statement</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {period === 'custom' 
                      ? `${customStartDate} to ${customEndDate}`
                      : `Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`
                    }
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Revenue</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(profitLossData.totalRevenue)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 pl-8">Less: Revenue VAT</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">({formatCurrency(profitLossData.revenueVAT)})</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Net Revenue</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(profitLossData.netRevenue)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Expenses</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(profitLossData.totalExpenses)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 pl-8">Less: Expense VAT (Recoverable)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">({formatCurrency(profitLossData.expenseVAT)})</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Net Expenses</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(profitLossData.netExpenses)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Gross Profit</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(profitLossData.grossProfit)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Net VAT Payable</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(profitLossData.netVAT)}</td>
                      </tr>
                      <tr className="bg-blue-50 border-t-2 border-blue-500">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Net Profit / Loss</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold" style={{ color: profitLossData.netProfit >= 0 ? '#10B981' : '#EF4444' }}>
                          {formatCurrency(profitLossData.netProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Revenue vs Expenses Chart */}
              {combinedTrendData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={combinedTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Revenue" />
                      <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Cash Flow Tab */}
          {activeTab === 'cashFlow' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Operating Cash Flow</p>
                    <FaDollarSign className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowData.operatingCashFlow)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Accounts Receivable</p>
                    <FaArrowUp className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowData.accountsReceivable)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Accounts Payable</p>
                    <FaArrowDown className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(cashFlowData.accountsPayable)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Net Cash Flow</p>
                    <FaChartBar className="w-5 h-5" style={{ color: cashFlowData.netCashFlow >= 0 ? '#10B981' : '#EF4444' }} />
                  </div>
                  <p className="text-2xl font-bold" style={{ color: cashFlowData.netCashFlow >= 0 ? '#10B981' : '#EF4444' }}>
                    {formatCurrency(cashFlowData.netCashFlow)}
                  </p>
                </div>
              </div>

              {/* Cash Flow Statement */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Cash Flow Statement</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Operating Income (Paid)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(cashFlowData.operatingIncome)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Operating Expenses (Paid)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">({formatCurrency(cashFlowData.operatingExpenses)})</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">Operating Cash Flow</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(cashFlowData.operatingCashFlow)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Accounts Receivable (Unpaid Invoices)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">+{formatCurrency(cashFlowData.accountsReceivable)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Accounts Payable (Unpaid Expenses)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">-{formatCurrency(cashFlowData.accountsPayable)}</td>
                      </tr>
                      <tr className="bg-blue-50 border-t-2 border-blue-500">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Net Cash Flow</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold" style={{ color: cashFlowData.netCashFlow >= 0 ? '#10B981' : '#EF4444' }}>
                          {formatCurrency(cashFlowData.netCashFlow)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Expense Analytics Tab */}
          {activeTab === 'expenseAnalytics' && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(profitLossData.totalExpenses)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Transaction Count</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Average Expense</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(filteredExpenses.length > 0 ? profitLossData.totalExpenses / filteredExpenses.length : 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Total VAT (Recoverable)</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(profitLossData.expenseVAT)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Largest Expense</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredExpenses.length > 0 
                        ? formatCurrency(Math.max(...filteredExpenses.map(exp => parseFloat(exp.amount) || 0)))
                        : formatCurrency(0)
                      }
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Most Common Category</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {expenseCategoryData.length > 0 ? expenseCategoryData[0].name : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              {expenseCategoryData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={expenseCategoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expenseCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div className="space-y-2">
                        {expenseCategoryData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              ></div>
                              <span className="text-sm font-medium text-gray-900">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Vendors */}
              {expenseVendorData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseVendorData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Monthly Trend */}
              {expenseTrendData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Expense Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={expenseTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Income Analytics Tab */}
          {activeTab === 'incomeAnalytics' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Income</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(profitLossData.totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-2">Transaction Count</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredIncome.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-2">Average Income</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(filteredIncome.length > 0 ? profitLossData.totalRevenue / filteredIncome.length : 0)}
                  </p>
                </div>
              </div>

              {/* Source Breakdown */}
              {incomeSourceData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Income by Source</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={incomeSourceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {incomeSourceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div className="space-y-2">
                        {incomeSourceData.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              ></div>
                              <span className="text-sm font-medium text-gray-900">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Customers */}
              {incomeCustomerData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeCustomerData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Monthly Trend */}
              {incomeTrendData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Income Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={incomeTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
