/**
 * FORECASTING & BUDGETING MODULE
 * 
 * Comprehensive financial forecasting and budget management:
 * - Budget planning by category/project
 * - Revenue forecasting
 * - Cash flow projections
 * - Variance analysis (actual vs budget)
 * - Scenario planning
 * - Monthly/quarterly/annual forecasts
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlusCircle,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaChartLine,
  FaDollarSign,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFilter,
  FaDownload,
  FaUpload,
  FaLightbulb,
  FaChartBar,
  FaPercentage,
  FaArrowUp,
  FaArrowDown,
  FaSpinner
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import CompanySelector from './CompanySelector';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyBudgets,
  addCompanyBudget,
  updateCompanyBudget,
  deleteCompanyBudget,
  getCompanyForecasts,
  addCompanyForecast,
  updateCompanyForecast,
  deleteCompanyForecast,
  getCompanyExpenses,
  getCompanyIncome
} from '../firebase';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';

const ForecastingTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const headerLogo = useMemo(() => getHeaderLogo(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);

  // State Management
  const [activeTab, setActiveTab] = useState('budgets'); // 'budgets', 'forecasts', 'variance', 'scenarios'
  const [budgets, setBudgets] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // 'month', 'quarter', 'year'

  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    period: 'all',
    status: 'all'
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'budget', // 'budget', 'forecast'
    category: '',
    period: 'month', // 'month', 'quarter', 'year'
    startDate: '',
    endDate: '',
    amount: 0,
    description: '',
    status: 'active', // For forecasts
    notes: ''
  });

  // Load data
  useEffect(() => {
    if (!currentCompanyId) return;
    loadAllData();
  }, [currentCompanyId]);

  const loadAllData = async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    try {
      const [budgetsData, forecastsData, expensesData, incomeData] = await Promise.all([
        getCompanyBudgets(currentCompanyId),
        getCompanyForecasts(currentCompanyId),
        getCompanyExpenses(currentCompanyId),
        getCompanyIncome(currentCompanyId)
      ]);
      
      setBudgets(budgetsData || []);
      setForecasts(forecastsData || []);
      setExpenses(expensesData || []);
      setIncome(incomeData || []);
    } catch (error) {
      console.error('Error loading forecasting data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Get current period budgets
    const currentBudgets = budgets.filter(b => {
      if (!b.startDate) return false;
      const budgetDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
      const budgetYear = budgetDate.getFullYear();
      const budgetMonth = budgetDate.getMonth();
      return budgetYear === currentYear && budgetMonth === currentMonth;
    });
    
    const totalBudget = currentBudgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    
    // Get actual expenses for current period
    const currentExpenses = expenses.filter(exp => {
      if (!exp.date) return false;
      const expYear = new Date(exp.date).getFullYear();
      const expMonth = new Date(exp.date).getMonth();
      return expYear === currentYear && expMonth === currentMonth;
    });
    
    const totalActual = currentExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    // Get forecasts
    const activeForecasts = forecasts.filter(f => f.status === 'active');
    const totalForecast = activeForecasts.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    
    // Variance
    const variance = totalBudget - totalActual;
    const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;
    
    return {
      totalBudget,
      totalActual,
      variance,
      variancePercent,
      totalForecast,
      budgetCount: budgets.length,
      forecastCount: forecasts.length
    };
  }, [budgets, expenses, forecasts]);

  // Calculate variance analysis
  const varianceAnalysis = useMemo(() => {
    const analysis = [];
    
    // Group budgets by category
    const budgetsByCategory = {};
    budgets.forEach(budget => {
      const category = budget.category || 'Uncategorized';
      if (!budgetsByCategory[category]) {
        budgetsByCategory[category] = { budget: 0, actual: 0 };
      }
      budgetsByCategory[category].budget += parseFloat(budget.amount) || 0;
    });
    
    // Group expenses by category
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      if (!budgetsByCategory[category]) {
        budgetsByCategory[category] = { budget: 0, actual: 0 };
      }
      budgetsByCategory[category].actual += parseFloat(expense.amount) || 0;
    });
    
    // Calculate variance for each category
    Object.entries(budgetsByCategory).forEach(([category, data]) => {
      const variance = data.budget - data.actual;
      const variancePercent = data.budget > 0 ? (variance / data.budget) * 100 : 0;
      
      analysis.push({
        category,
        budget: data.budget,
        actual: data.actual,
        variance,
        variancePercent,
        status: variancePercent > 10 ? 'over' : variancePercent < -10 ? 'under' : 'on-track'
      });
    });
    
    return analysis.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));
  }, [budgets, expenses]);

  // Calculate cash flow projection
  const cashFlowProjection = useMemo(() => {
    const projection = [];
    const today = new Date();
    const months = [];
    
    // Generate next 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({
        month: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        date
      });
    }
    
    // Calculate projected income and expenses for each month
    months.forEach(({ month, monthKey, date }) => {
      // Get forecasted income for this month
      const monthForecasts = forecasts.filter(f => {
        if (f.status !== 'active') return false;
        if (!f.startDate) return false;
        const forecastDate = f.startDate?.toDate ? f.startDate.toDate() : new Date(f.startDate);
        return forecastDate.getFullYear() === date.getFullYear() && 
               forecastDate.getMonth() === date.getMonth();
      });
      const projectedIncome = monthForecasts.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
      
      // Get budgeted expenses for this month
      const monthBudgets = budgets.filter(b => {
        if (!b.startDate) return false;
        const budgetDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
        return budgetDate.getFullYear() === date.getFullYear() && 
               budgetDate.getMonth() === date.getMonth();
      });
      const projectedExpenses = monthBudgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
      
      // Get actual income/expenses if available
      const actualIncome = income.filter(inc => {
        if (!inc.date) return false;
        const incDate = new Date(inc.date);
        return incDate.getFullYear() === date.getFullYear() && 
               incDate.getMonth() === date.getMonth();
      }).reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
      
      const actualExpenses = expenses.filter(exp => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === date.getFullYear() && 
               expDate.getMonth() === date.getMonth();
      }).reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
      
      projection.push({
        month,
        monthKey,
        projectedIncome,
        projectedExpenses,
        actualIncome: date <= today ? actualIncome : 0,
        actualExpenses: date <= today ? actualExpenses : 0,
        projectedNet: projectedIncome - projectedExpenses,
        actualNet: date <= today ? (actualIncome - actualExpenses) : null
      });
    });
    
    return projection;
  }, [forecasts, budgets, income, expenses]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentCompanyId || !currentUser) return;

    try {
      const itemData = {
        ...formData,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid
      };

      if (formData.type === 'budget') {
        if (editingItem) {
          await updateCompanyBudget(currentCompanyId, editingItem.id, itemData);
        } else {
          await addCompanyBudget(currentCompanyId, currentUser.uid, itemData);
        }
      } else {
        if (editingItem) {
          await updateCompanyForecast(currentCompanyId, editingItem.id, itemData);
        } else {
          await addCompanyForecast(currentCompanyId, currentUser.uid, itemData);
        }
      }
      
      await loadAllData();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving. Please try again.');
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm(`Are you sure you want to delete this ${activeTab === 'budgets' ? 'budget' : 'forecast'}?`)) return;
    if (!currentCompanyId) return;

    try {
      if (activeTab === 'budgets') {
        await deleteCompanyBudget(currentCompanyId, itemId);
      } else {
        await deleteCompanyForecast(currentCompanyId, itemId);
      }
      await loadAllData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: activeTab === 'budgets' ? 'budget' : 'forecast',
      category: '',
      period: 'month',
      startDate: '',
      endDate: '',
      amount: 0,
      description: '',
      status: 'active',
      notes: ''
    });
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      type: item.type || (activeTab === 'budgets' ? 'budget' : 'forecast'),
      category: item.category || '',
      period: item.period || 'month',
      startDate: item.startDate?.toDate ? item.startDate.toDate().toISOString().split('T')[0] : (item.startDate || ''),
      endDate: item.endDate?.toDate ? item.endDate.toDate().toISOString().split('T')[0] : (item.endDate || ''),
      amount: item.amount || 0,
      description: item.description || '',
      status: item.status || 'active',
      notes: item.notes || ''
    });
    setShowAddModal(true);
  };

  const handleNew = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      type: activeTab === 'budgets' ? 'budget' : 'forecast',
      startDate: new Date().toISOString().split('T')[0]
    }));
    setShowAddModal(true);
  };

  // Filter data
  const filteredBudgets = useMemo(() => {
    let filtered = budgets;

    if (filters.category !== 'all') {
      filtered = filtered.filter(b => b.category === filters.category);
    }
    if (filters.period !== 'all') {
      filtered = filtered.filter(b => b.period === filters.period);
    }

    return filtered;
  }, [budgets, filters]);

  const filteredForecasts = useMemo(() => {
    let filtered = forecasts;

    if (filters.category !== 'all') {
      filtered = filtered.filter(f => f.category === filters.category);
    }
    if (filters.period !== 'all') {
      filtered = filtered.filter(f => f.period === filters.period);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(f => f.status === filters.status);
    }

    return filtered;
  }, [forecasts, filters]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    [...budgets, ...forecasts, ...expenses].forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [budgets, forecasts, expenses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading forecasting data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">€{metrics.totalBudget.toLocaleString()}</p>
              </div>
              <FaDollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Actual Spending</p>
                <p className="text-2xl font-bold text-gray-900">€{metrics.totalActual.toLocaleString()}</p>
              </div>
              <FaChartBar className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Variance</p>
                <p className={`text-2xl font-bold ${metrics.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{metrics.variance.toLocaleString()}
                </p>
                <p className={`text-xs ${metrics.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.variancePercent >= 0 ? '+' : ''}{metrics.variancePercent.toFixed(1)}%
                </p>
              </div>
              {metrics.variance >= 0 ? (
                <FaArrowUp className="w-8 h-8 text-green-400" />
              ) : (
                <FaArrowDown className="w-8 h-8 text-red-400" />
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Forecasted Revenue</p>
                <p className="text-2xl font-bold text-blue-600">€{metrics.totalForecast.toLocaleString()}</p>
              </div>
              <FaLightbulb className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('budgets')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'budgets'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Budgets
              </button>
              <button
                onClick={() => setActiveTab('forecasts')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'forecasts'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Forecasts
              </button>
              <button
                onClick={() => setActiveTab('variance')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'variance'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Variance Analysis
              </button>
              <button
                onClick={() => setActiveTab('scenarios')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'scenarios'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cash Flow Projection
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Budgets Tab */}
            {activeTab === 'budgets' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Budgets</h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleNew}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <FaPlusCircle className="w-4 h-4" />
                      New Budget
                    </button>
                  </div>
                </div>

                {filteredBudgets.length === 0 ? (
                  <div className="text-center py-12">
                    <FaDollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-900 mb-2">No budgets yet</p>
                    <p className="text-gray-600 mb-4">Create your first budget to get started</p>
                    <button
                      onClick={handleNew}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Create Budget
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBudgets.map(budget => (
                      <div
                        key={budget.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">{budget.name}</h3>
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {budget.category || 'Uncategorized'}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              {budget.period}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{budget.description}</p>
                          <p className="text-lg font-bold text-gray-900 mt-2">
                            €{parseFloat(budget.amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(budget)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(budget.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Forecasts Tab */}
            {activeTab === 'forecasts' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Revenue Forecasts</h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={handleNew}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <FaPlusCircle className="w-4 h-4" />
                      New Forecast
                    </button>
                  </div>
                </div>

                {filteredForecasts.length === 0 ? (
                  <div className="text-center py-12">
                    <FaLightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-900 mb-2">No forecasts yet</p>
                    <p className="text-gray-600 mb-4">Create your first revenue forecast</p>
                    <button
                      onClick={handleNew}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Create Forecast
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredForecasts.map(forecast => (
                      <div
                        key={forecast.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">{forecast.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              forecast.status === 'active' ? 'bg-green-100 text-green-800' :
                              forecast.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {forecast.status}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              {forecast.period}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{forecast.description}</p>
                          <p className="text-lg font-bold text-blue-600 mt-2">
                            €{parseFloat(forecast.amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(forecast)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(forecast.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Variance Analysis Tab */}
            {activeTab === 'variance' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Variance Analysis</h2>
                {varianceAnalysis.length === 0 ? (
                  <div className="text-center py-12">
                    <FaChartBar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No variance data available. Create budgets and track expenses to see variance analysis.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Budget</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Actual</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Variance</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Variance %</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {varianceAnalysis.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{item.category}</td>
                            <td className="py-3 px-4 text-right">€{item.budget.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right">€{item.actual.toLocaleString()}</td>
                            <td className={`py-3 px-4 text-right font-semibold ${
                              item.variance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              €{item.variance.toLocaleString()}
                            </td>
                            <td className={`py-3 px-4 text-right ${
                              item.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.variancePercent >= 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                item.status === 'over' ? 'bg-red-100 text-red-800' :
                                item.status === 'under' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {item.status === 'over' ? 'Over Budget' :
                                 item.status === 'under' ? 'Under Budget' :
                                 'On Track'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Cash Flow Projection Tab */}
            {activeTab === 'scenarios' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">12-Month Cash Flow Projection</h2>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="month">Monthly</option>
                    <option value="quarter">Quarterly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
                {cashFlowProjection.length === 0 ? (
                  <div className="text-center py-12">
                    <FaChartLine className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Create budgets and forecasts to see cash flow projections.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Month</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Projected Income</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Projected Expenses</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Projected Net</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">Actual Net</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashFlowProjection.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{item.month}</td>
                            <td className="py-3 px-4 text-right">€{item.projectedIncome.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right">€{item.projectedExpenses.toLocaleString()}</td>
                            <td className={`py-3 px-4 text-right font-semibold ${
                              item.projectedNet >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              €{item.projectedNet.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {item.actualNet !== null ? (
                                <span className={item.actualNet >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  €{item.actualNet.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.actualNet !== null && (
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  item.actualNet >= item.projectedNet * 0.9 ? 'bg-green-100 text-green-800' :
                                  item.actualNet >= item.projectedNet * 0.7 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {item.actualNet >= item.projectedNet * 0.9 ? 'On Track' :
                                   item.actualNet >= item.projectedNet * 0.7 ? 'At Risk' :
                                   'Behind'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? `Edit ${formData.type === 'budget' ? 'Budget' : 'Forecast'}` : `New ${formData.type === 'budget' ? 'Budget' : 'Forecast'}`}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., Q1 Marketing Budget"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      list="categories"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., Marketing, Operations"
                    />
                    <datalist id="categories">
                      {categories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period *
                    </label>
                    <select
                      name="period"
                      value={formData.period}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="month">Monthly</option>
                      <option value="quarter">Quarterly</option>
                      <option value="year">Annual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (€) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Budget or forecast description..."
                  />
                </div>

                {formData.type === 'forecast' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status || 'active'}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                >
                  <FaSave className="w-4 h-4" />
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastingTracker;

