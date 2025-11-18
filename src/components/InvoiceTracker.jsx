/**
 * INVOICE TRACKER MODULE (Accounts Receivable)
 * 
 * Full invoice management with SaaS-specific features:
 * - Quotes → Invoices → Payments workflow
 * - Subscription/recurring billing support
 * - Customer management
 * - Aging reports and overdue tracking
 * - MRR/ARR metrics
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
  FaFileInvoiceDollar,
  FaFileAlt,
  FaSave,
  FaDollarSign,
  FaUser,
  FaBuilding,
  FaCalendar,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaFileContract,
  FaCreditCard,
  FaDownload,
  FaFilter,
  FaSearch,
  FaArrowRight,
  FaTag,
  FaUsers,
  FaEnvelope,
  FaFilePdf
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import CompanySelector from './CompanySelector';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import FinancialAccountSelect from './FinancialAccountSelect';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyInvoices,
  getCompanyQuotes,
  getCompanyCustomers,
  getCompanySubscriptions,
  addCompanyInvoice,
  updateCompanyInvoice,
  deleteCompanyInvoice,
  addCompanyQuote,
  updateCompanyQuote,
  convertQuoteToInvoice,
  addCompanyCustomer,
  updateCompanyCustomer,
  addCompanySubscription,
  updateCompanySubscription,
  deleteCompanySubscription,
  getCompanyFinancialAccounts,
  generateInvoiceFromSubscription
} from '../firebase';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';
import { generateInvoicePDF, downloadPDF } from '../utils/pdfGenerator';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const EU_COUNTRY_OPTIONS = [
  { code: 'BE', label: 'Belgium' },
  { code: 'BG', label: 'Bulgaria' },
  { code: 'CZ', label: 'Czech Republic' },
  { code: 'DK', label: 'Denmark' },
  { code: 'DE', label: 'Germany' },
  { code: 'EE', label: 'Estonia' },
  { code: 'IE', label: 'Ireland' },
  { code: 'EL', label: 'Greece' },
  { code: 'ES', label: 'Spain' },
  { code: 'FR', label: 'France' },
  { code: 'HR', label: 'Croatia' },
  { code: 'IT', label: 'Italy' },
  { code: 'CY', label: 'Cyprus' },
  { code: 'LV', label: 'Latvia' },
  { code: 'LT', label: 'Lithuania' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'HU', label: 'Hungary' },
  { code: 'MT', label: 'Malta' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'AT', label: 'Austria' },
  { code: 'PL', label: 'Poland' },
  { code: 'PT', label: 'Portugal' },
  { code: 'RO', label: 'Romania' },
  { code: 'SI', label: 'Slovenia' },
  { code: 'SK', label: 'Slovakia' },
  { code: 'FI', label: 'Finland' },
  { code: 'SE', label: 'Sweden' }
];

const InvoiceTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const headerLogo = useMemo(() => getHeaderLogo(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);

  // State Management
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'quotes', 'subscriptions', 'customers'
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    vatNumber: '',
    accountType: 'one_time'
  });

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    customerId: 'all',
    periodType: 'all',
    startDate: '',
    endDate: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    // Common fields
    type: 'invoice', // 'invoice', 'quote', 'subscription'
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    // Invoice/Quote fields
    invoiceNumber: '',
    quoteNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    quoteDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    expiryDate: '',
    status: 'draft',
    lineItems: [],
    subtotal: 0,
    taxRate: 21,
    taxAmount: 0,
    total: 0,
    currency: 'EUR',
    notes: '',
    terms: '',
    // Payment fields
    paidDate: '',
    paidAmount: 0,
    paymentMethod: '',
    financialAccountId: '',
    paymentLink: '',
    // Subscription fields
    planName: '',
    planType: 'monthly',
    billingCycle: 'monthly',
    amount: 0,
    seats: 1,
    autoRenew: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    nextBillingDate: '',
    mrr: 0,
    arr: 0
  });

  // Track last loaded company
  const lastLoadedCompanyIdRef = useRef(null);

  // Load data when component mounts or company changes
  useEffect(() => {
    if (!currentUser || !currentCompanyId) {
      setInvoices([]);
      setQuotes([]);
      setSubscriptions([]);
      setCustomers([]);
      setLoading(false);
      return;
    }

    if (lastLoadedCompanyIdRef.current !== currentCompanyId) {
      lastLoadedCompanyIdRef.current = currentCompanyId;
      loadAllData();
    }
  }, [currentUser, currentCompanyId]);


  const loadAllData = async () => {
    if (!currentCompanyId) return;

    try {
      setLoading(true);
      const [invoicesData, quotesData, subscriptionsData, customersData, accountsData] = await Promise.all([
        getCompanyInvoices(currentCompanyId),
        getCompanyQuotes(currentCompanyId),
        getCompanySubscriptions(currentCompanyId),
        getCompanyCustomers(currentCompanyId),
        getCompanyFinancialAccounts(currentCompanyId)
      ]);

      setInvoices(invoicesData || []);
      setQuotes(quotesData || []);
      setSubscriptions(subscriptionsData || []);
      setCustomers(customersData || []);
      setFinancialAccounts(accountsData || []);
    } catch (error) {
      console.error('Error loading AR data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    // Outstanding = all unpaid invoices (draft, sent, overdue) - this gives a complete picture
    const outstandingAmount = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    
    // Overdue invoices
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status !== 'sent') return false;
      const dueDate = inv.dueDate?.toDate?.() || new Date(inv.dueDate);
      return dueDate < now;
    });
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

    // SaaS metrics - include active and draft subscriptions (draft = committed but not yet active)
    const activeSubscriptions = subscriptions.filter(sub => ['active', 'draft'].includes(sub.status));
    const mrr = activeSubscriptions.reduce((sum, sub) => {
      const subMrr = parseFloat(sub.mrr) || 0;
      if (subMrr > 0) return sum + subMrr;
      // Calculate MRR from amount and billing cycle
      const amount = parseFloat(sub.amount) || 0;
      if (sub.billingCycle === 'monthly') return sum + amount;
      if (sub.billingCycle === 'quarterly') return sum + (amount / 3);
      if (sub.billingCycle === 'annual') return sum + (amount / 12);
      return sum;
    }, 0);
    const arr = mrr * 12;

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      outstandingAmount,
      overdueCount: overdueInvoices.length,
      overdueAmount,
      activeSubscriptions: activeSubscriptions.length,
      mrr,
      arr
    };
  }, [invoices, subscriptions]);

  // Filtered data
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    if (filters.status !== 'all') {
      filtered = filtered.filter(inv => inv.status === filters.status);
    }
    if (filters.customerId !== 'all') {
      filtered = filtered.filter(inv => inv.customerId === filters.customerId);
    }

    // Mark overdue invoices
    const now = new Date();
    filtered = filtered.map(inv => {
      if (inv.status === 'sent' && inv.dueDate) {
        const dueDate = inv.dueDate?.toDate?.() || new Date(inv.dueDate);
        if (dueDate < now) {
          return { ...inv, status: 'overdue' };
        }
      }
      return inv;
    });

    return filtered;
  }, [invoices, filters]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        customerName: customer.name || customer.company || '',
        customerEmail: customer.email || '',
        customerAddress: [
          customer.address,
          customer.city,
          customer.postalCode,
          customer.country
        ].filter(Boolean).join(', ')
      }));
    }
  };

  const handleAddLineItem = () => {
    setFormData(prev => {
      const newLineItems = [
        ...prev.lineItems,
        { description: '', quantity: 1, unitPrice: 0, amount: 0 }
      ];
      
      // Recalculate totals after adding new item
      const subtotal = newLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const taxAmount = subtotal * (prev.taxRate / 100);
      const total = subtotal + taxAmount;
      
      return {
        ...prev,
        lineItems: newLineItems,
        subtotal,
        taxAmount,
        total
      };
    });
  };

  const handleLineItemChange = (index, field, value) => {
    setFormData(prev => {
      const newLineItems = [...prev.lineItems];
      newLineItems[index] = {
        ...newLineItems[index],
        [field]: field === 'quantity' || field === 'unitPrice' ? parseFloat(value) || 0 : value
      };
      
      // Calculate line item amount
      if (field === 'quantity' || field === 'unitPrice') {
        newLineItems[index].amount = (newLineItems[index].quantity || 0) * (newLineItems[index].unitPrice || 0);
      }
      
      // Recalculate totals
      const subtotal = newLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const taxAmount = subtotal * (prev.taxRate / 100);
      const total = subtotal + taxAmount;
      
      return {
        ...prev,
        lineItems: newLineItems,
        subtotal,
        taxAmount,
        total
      };
    });
  };

  const handleRemoveLineItem = (index) => {
    setFormData(prev => {
      const newLineItems = prev.lineItems.filter((_, i) => i !== index);
      const subtotal = newLineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const taxAmount = subtotal * (prev.taxRate / 100);
      const total = subtotal + taxAmount;
      
      return {
        ...prev,
        lineItems: newLineItems,
        subtotal,
        taxAmount,
        total
      };
    });
  };

  const resetForm = () => {
    setFormData({
      type: 'invoice',
      customerId: '',
      customerName: '',
      customerEmail: '',
      customerAddress: '',
      invoiceNumber: '',
      quoteNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      quoteDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      expiryDate: '',
      status: 'draft',
      lineItems: [],
      subtotal: 0,
      taxRate: 21,
      taxAmount: 0,
      total: 0,
      currency: 'EUR',
      notes: '',
      terms: '',
      paidDate: '',
      paidAmount: 0,
      paymentMethod: '',
      financialAccountId: '',
      paymentLink: '',
      planName: '',
      planType: 'monthly',
      billingCycle: 'monthly',
      amount: 0,
      seats: 1,
      autoRenew: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      nextBillingDate: '',
      mrr: 0,
      arr: 0
    });
    setEditingItem(null);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!currentCompanyId || !currentUser) return;

    try {
      if (!customerFormData.name && !customerFormData.company) {
        alert('Please enter a customer name or company name.');
        return;
      }

      let customerId;
      if (editingItem && editingItem.id && !editingItem.type) {
        // Editing existing customer from customers tab
        customerId = editingItem.id;
        await updateCompanyCustomer(currentCompanyId, customerId, customerFormData);
      } else {
        // Creating new customer
        customerId = await addCompanyCustomer(currentCompanyId, currentUser.uid, customerFormData);
      }

      await loadAllData();
      
      // If we're in invoice/quote modal, auto-select the newly created customer
      if (showAddModal && (formData.type === 'invoice' || formData.type === 'quote')) {
        // Fetch the newly created customer to populate form data
        const updatedCustomers = await getCompanyCustomers(currentCompanyId);
        const newCustomer = updatedCustomers.find(c => c.id === customerId);
        if (newCustomer) {
          handleCustomerSelect(customerId);
        }
      }
      
      setCustomerFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        postalCode: '',
        vatNumber: '',
        accountType: 'one_time'
      });
      setShowCustomerModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer. Please try again.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentCompanyId || !currentUser) return;

    try {
      if (formData.type === 'invoice') {
        if (editingItem) {
          await updateCompanyInvoice(currentCompanyId, editingItem.id, {
            ...formData,
            updatedBy: currentUser.uid
          });
        } else {
          await addCompanyInvoice(currentCompanyId, currentUser.uid, formData);
        }
      } else if (formData.type === 'quote') {
        if (editingItem) {
          await updateCompanyQuote(currentCompanyId, editingItem.id, formData);
        } else {
          await addCompanyQuote(currentCompanyId, currentUser.uid, formData);
        }
      } else if (formData.type === 'subscription') {
        if (editingItem) {
          await updateCompanySubscription(currentCompanyId, editingItem.id, formData);
        } else {
          await addCompanySubscription(currentCompanyId, currentUser.uid, formData);
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

  const handleDelete = async (itemId, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    if (!currentCompanyId) return;

    try {
      if (type === 'invoice') {
        await deleteCompanyInvoice(currentCompanyId, itemId);
      } else if (type === 'quote') {
        // Quotes don't have a delete function yet, but we can add it if needed
        alert('Quote deletion not yet implemented');
        return;
      } else if (type === 'subscription') {
        await deleteCompanySubscription(currentCompanyId, itemId);
      }
      await loadAllData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting. Please try again.');
    }
  };

  const handleConvertQuote = async (quoteId) => {
    if (!currentCompanyId || !currentUser) return;
    try {
      const invoiceId = await convertQuoteToInvoice(currentCompanyId, quoteId, currentUser.uid);
      await loadAllData();
      // Reload invoices to get the new one
      const updatedInvoices = await getCompanyInvoices(currentCompanyId);
      const invoice = updatedInvoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        setViewingItem(invoice);
        setShowDetailDrawer(true);
        setActiveTab('invoices');
      }
    } catch (error) {
      console.error('Error converting quote:', error);
      alert('Error converting quote. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'gray',
      sent: 'blue',
      paid: 'green',
      overdue: 'red',
      cancelled: 'gray',
      accepted: 'green',
      rejected: 'red',
      expired: 'orange',
      active: 'green',
      paused: 'yellow'
    };
    return colors[status] || 'gray';
  };

  const handleDownloadPDF = async (document, type = 'invoice') => {
    try {
      const pdfDoc = await generateInvoicePDF(document, currentCompany, type);
      const filename = type === 'invoice' 
        ? `Invoice-${document.invoiceNumber || document.id}.pdf`
        : `Quote-${document.quoteNumber || document.id}.pdf`;
      downloadPDF(pdfDoc, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleSendEmail = async (document, type = 'invoice') => {
    if (!currentCompanyId) return;
    
    const recipientEmail = document.customerEmail || prompt('Enter recipient email address:');
    if (!recipientEmail) return;

    try {
      const functions = getFunctions(app, 'us-central1');
      const sendEmail = httpsCallable(
        functions,
        type === 'invoice' ? 'sendInvoiceEmail' : 'sendQuoteEmail'
      );
      
      await sendEmail({
        companyId: currentCompanyId,
        [type === 'invoice' ? 'invoiceId' : 'quoteId']: document.id,
        recipientEmail
      });

      alert(`Email sent successfully to ${recipientEmail}`);
      await loadAllData();
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Error sending email: ${error.message || 'Please try again.'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
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
              <ModuleNavigationButton currentModuleId="invoices" />
              
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: '#2F6F63' }} // Mint/teal color matching the card
              >
                <FaFileInvoiceDollar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Invoices & Receivables</h1>
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
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  €{metrics.outstandingAmount.toFixed(2)}
                </p>
              </div>
              <FaFileInvoiceDollar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  €{metrics.overdueAmount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{metrics.overdueCount} invoices</p>
              </div>
              <FaExclamationTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Recurring Revenue</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  €{metrics.mrr.toFixed(2)}
                </p>
              </div>
              <FaSyncAlt className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Annual Recurring Revenue</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  €{metrics.arr.toFixed(2)}
                </p>
              </div>
              <FaChartLine className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'invoices', label: 'Invoices', icon: FaFileInvoiceDollar },
                { id: 'quotes', label: 'Quotes', icon: FaFileContract },
                { id: 'subscriptions', label: 'Subscriptions', icon: FaSyncAlt },
                { id: 'customers', label: 'Customers', icon: FaUsers }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Filters */}
            <div className="flex items-center space-x-4 mb-4">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={filters.customerId}
                onChange={(e) => setFilters(prev => ({ ...prev, customerId: e.target.value }))}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
              >
                <option value="all">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name || customer.company}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (activeTab === 'customers') {
                    // Open customer modal for new customer
                    setCustomerFormData({
                      name: '',
                      company: '',
                      email: '',
                      phone: '',
                      address: '',
                      city: '',
                      country: '',
                      postalCode: '',
                      vatNumber: '',
                      accountType: 'one_time'
                    });
                    setEditingItem(null);
                    setShowCustomerModal(true);
                  } else {
                    // Open main modal for invoices, quotes, subscriptions
                    resetForm();
                    setFormData(prev => ({ 
                      ...prev, 
                      type: activeTab === 'quotes' ? 'quote' : activeTab === 'subscriptions' ? 'subscription' : 'invoice',
                      // Initialize with one empty line item for invoices/quotes
                      lineItems: (activeTab === 'invoices' || activeTab === 'quotes') ? [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }] : []
                    }));
                    setShowAddModal(true);
                  }
                }}
                className="ml-auto flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                <FaPlusCircle />
                <span>New {activeTab === 'quotes' ? 'Quote' : activeTab === 'subscriptions' ? 'Subscription' : activeTab === 'customers' ? 'Customer' : 'Invoice'}</span>
              </button>
            </div>

            {/* Invoices List */}
            {activeTab === 'invoices' && (
              <div className="space-y-2">
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FaFileInvoiceDollar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No invoices found</p>
                  </div>
                ) : (
                  filteredInvoices.map(invoice => {
                    const invoiceDate = invoice.invoiceDate?.toDate?.() || new Date(invoice.invoiceDate);
                    const dueDate = invoice.dueDate?.toDate?.() || new Date(invoice.dueDate);
                    const isOverdue = invoice.status === 'sent' && dueDate < new Date();
                    
                    return (
                      <div
                        key={invoice.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setViewingItem(invoice);
                          setShowDetailDrawer(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                                {invoice.quoteId && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded" title="From Quote">
                                    <FaFileContract className="inline mr-1" />
                                    Quote
                                  </span>
                                )}
                                {invoice.subscriptionId && (
                                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded" title="From Subscription">
                                    <FaSyncAlt className="inline mr-1" />
                                    Subscription
                                  </span>
                                )}
                                {invoice.incomeId && (
                                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded" title="Payment Recorded">
                                    <FaDollarSign className="inline mr-1" />
                                    Paid
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{invoice.customerName}</p>
                            </div>
                            <div className="text-sm text-gray-500">
                              <p>Date: {invoiceDate.toLocaleDateString()}</p>
                              <p>Due: {dueDate.toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-bold text-gray-900">€{parseFloat(invoice.total || 0).toFixed(2)}</p>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isOverdue
                                    ? 'bg-red-100 text-red-800'
                                    : invoice.status === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {isOverdue ? 'Overdue' : invoice.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPDF(invoice, 'invoice');
                                }}
                                className="p-2 text-gray-600 hover:text-red-600"
                                title="Download PDF"
                              >
                                <FaFilePdf />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendEmail(invoice, 'invoice');
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600"
                                title="Send Email"
                              >
                                <FaEnvelope />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(invoice);
                                  setFormData({
                                    ...invoice,
                                    invoiceDate: invoiceDate.toISOString().split('T')[0],
                                    dueDate: dueDate.toISOString().split('T')[0],
                                    paidDate: invoice.paidDate ? (invoice.paidDate.toDate?.() || new Date(invoice.paidDate)).toISOString().split('T')[0] : '',
                                    type: 'invoice'
                                  });
                                  setShowAddModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-indigo-600"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(invoice.id, 'invoice');
                                }}
                                className="p-2 text-gray-600 hover:text-red-600"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Quotes List */}
            {activeTab === 'quotes' && (
              <div className="space-y-2">
                {quotes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FaFileContract className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No quotes found</p>
                  </div>
                ) : (
                  quotes.map(quote => {
                    const quoteDate = quote.quoteDate?.toDate?.() || new Date(quote.quoteDate);
                    const expiryDate = quote.expiryDate?.toDate?.() || new Date(quote.expiryDate);
                    const isExpired = quote.status === 'sent' && expiryDate < new Date();
                    
                    return (
                      <div
                        key={quote.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="font-semibold text-gray-900">{quote.quoteNumber}</p>
                              <p className="text-sm text-gray-600">{quote.customerName}</p>
                            </div>
                            <div className="text-sm text-gray-500">
                              <p>Date: {quoteDate.toLocaleDateString()}</p>
                              <p>Expires: {expiryDate.toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-bold text-gray-900">€{parseFloat(quote.total || 0).toFixed(2)}</p>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isExpired
                                    ? 'bg-orange-100 text-orange-800'
                                    : quote.status === 'accepted'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {isExpired ? 'Expired' : quote.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPDF(quote, 'quote');
                                }}
                                className="p-2 text-gray-600 hover:text-red-600"
                                title="Download PDF"
                              >
                                <FaFilePdf />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendEmail(quote, 'quote');
                                }}
                                className="p-2 text-gray-600 hover:text-blue-600"
                                title="Send Email"
                              >
                                <FaEnvelope />
                              </button>
                              {quote.status === 'sent' && !isExpired && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConvertQuote(quote.id);
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                  Convert to Invoice
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(quote);
                                  setFormData({
                                    ...quote,
                                    quoteDate: quoteDate.toISOString().split('T')[0],
                                    expiryDate: expiryDate.toISOString().split('T')[0],
                                    type: 'quote'
                                  });
                                  setShowAddModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-indigo-600"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Subscriptions List */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-2">
                {subscriptions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FaSyncAlt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No subscriptions found</p>
                  </div>
                ) : (
                  subscriptions.map(sub => {
                    const nextBillingDate = sub.nextBillingDate?.toDate 
                      ? sub.nextBillingDate.toDate() 
                      : sub.nextBillingDate 
                      ? new Date(sub.nextBillingDate)
                      : null;
                    const isBillingDue = nextBillingDate && nextBillingDate <= new Date();
                    
                    return (
                      <div
                        key={sub.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{sub.planName}</p>
                              {sub.lastInvoiceId && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  Invoice: {invoices.find(inv => inv.id === sub.lastInvoiceId)?.invoiceNumber || sub.lastInvoiceId}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{sub.customerName}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {sub.billingCycle} • {sub.seats} seat{sub.seats !== 1 ? 's' : ''}
                              {nextBillingDate && (
                                <span className={`ml-2 ${isBillingDue ? 'text-red-600 font-semibold' : ''}`}>
                                  • Next billing: {nextBillingDate.toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-bold text-gray-900">€{parseFloat(sub.amount || 0).toFixed(2)}</p>
                              <p className="text-xs text-gray-500">MRR: €{parseFloat(sub.mrr || 0).toFixed(2)}</p>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                                  sub.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : sub.status === 'paused'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                            {sub.status === 'active' && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Generate invoice for ${sub.planName}?`)) return;
                                  try {
                                    const invoiceId = await generateInvoiceFromSubscription(
                                      currentCompanyId,
                                      sub.id,
                                      currentUser.uid
                                    );
                                    await loadAllData();
                                    // Find and show the new invoice
                                    const updatedInvoices = await getCompanyInvoices(currentCompanyId);
                                    const newInvoice = updatedInvoices.find(inv => inv.id === invoiceId);
                                    if (newInvoice) {
                                      setViewingItem(newInvoice);
                                      setShowDetailDrawer(true);
                                      setActiveTab('invoices');
                                    }
                                    alert('Invoice generated successfully!');
                                  } catch (error) {
                                    console.error('Error generating invoice:', error);
                                    alert(`Error generating invoice: ${error.message}`);
                                  }
                                }}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-1"
                                style={{ backgroundColor: accentColor }}
                                title="Generate Invoice"
                              >
                                <FaFileInvoiceDollar className="w-3 h-3" />
                                Generate Invoice
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingItem(sub);
                                setFormData({
                                  ...sub,
                                  startDate: sub.startDate?.toDate 
                                    ? sub.startDate.toDate().toISOString().split('T')[0]
                                    : sub.startDate 
                                    ? new Date(sub.startDate).toISOString().split('T')[0]
                                    : new Date().toISOString().split('T')[0],
                                  endDate: sub.endDate?.toDate 
                                    ? sub.endDate.toDate().toISOString().split('T')[0]
                                    : sub.endDate 
                                    ? new Date(sub.endDate).toISOString().split('T')[0]
                                    : '',
                                  nextBillingDate: nextBillingDate 
                                    ? nextBillingDate.toISOString().split('T')[0]
                                    : '',
                                  type: 'subscription'
                                });
                                setShowAddModal(true);
                              }}
                              className="p-2 text-gray-600 hover:text-indigo-600"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Customers List */}
            {activeTab === 'customers' && (
              <div className="space-y-2">
                {customers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FaUsers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No customers found</p>
                  </div>
                ) : (
                  customers.map(customer => (
                    <div
                      key={customer.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{customer.name || customer.company}</p>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                          <p className="text-xs text-gray-500 mt-1">{customer.accountType}</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingItem(customer);
                            setFormData({ ...customer, type: 'customer' });
                            setShowAddModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-indigo-600"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit' : 'New'} {formData.type === 'quote' ? 'Quote' : formData.type === 'subscription' ? 'Subscription' : formData.type === 'customer' ? 'Customer' : 'Invoice'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Customer Selection */}
              {(formData.type === 'invoice' || formData.type === 'quote') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Customer *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerFormData({
                          name: '',
                          company: '',
                          email: '',
                          phone: '',
                          address: '',
                          city: '',
                          country: '',
                          postalCode: '',
                          vatNumber: '',
                          accountType: 'one_time'
                        });
                        setEditingItem(null);
                        setShowCustomerModal(true);
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      + Add New Customer
                    </button>
                  </div>
                  <select
                    name="customerId"
                    value={formData.customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">Select customer...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name || customer.company || customer.email || 'Unnamed Customer'}
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      No customers yet. Click "Add New Customer" to create one.
                    </p>
                  )}
                </div>
              )}

              {/* Invoice/Quote Date Fields */}
              {(formData.type === 'invoice' || formData.type === 'quote') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'quote' ? 'Quote Date' : 'Invoice Date'} *
                    </label>
                    <input
                      type="date"
                      name={formData.type === 'quote' ? 'quoteDate' : 'invoiceDate'}
                      value={formData.type === 'quote' ? (formData.quoteDate || formData.invoiceDate) : formData.invoiceDate}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        setFormData(prev => {
                          if (prev.type === 'quote') {
                            // Auto-calculate expiry date (30 days from quote date)
                            const quoteDate = new Date(dateValue);
                            const expiryDate = new Date(quoteDate);
                            expiryDate.setDate(expiryDate.getDate() + 30);
                            return { ...prev, quoteDate: dateValue, invoiceDate: dateValue, expiryDate: expiryDate.toISOString().split('T')[0] };
                          } else {
                            // Auto-calculate due date (30 days from invoice date)
                            const invoiceDate = new Date(dateValue);
                            const dueDate = new Date(invoiceDate);
                            dueDate.setDate(dueDate.getDate() + 30);
                            return { ...prev, invoiceDate: dateValue, dueDate: dueDate.toISOString().split('T')[0] };
                          }
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'quote' ? 'Expiry Date' : 'Due Date'} *
                    </label>
                    <input
                      type="date"
                      name={formData.type === 'quote' ? 'expiryDate' : 'dueDate'}
                      value={formData.type === 'quote' ? formData.expiryDate : formData.dueDate}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Line Items (for invoices/quotes) */}
              {(formData.type === 'invoice' || formData.type === 'quote') && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Line Items</label>
                      <button
                        type="button"
                        onClick={handleAddLineItem}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        + Add Item
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.lineItems.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                            className="w-20 border border-gray-300 rounded px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                            className="w-24 border border-gray-300 rounded px-3 py-2 text-sm"
                          />
                          <span className="w-20 text-sm text-gray-600">€{item.amount.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                      <input
                        type="number"
                        name="taxRate"
                        value={formData.taxRate}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            taxRate: rate,
                            taxAmount: prev.subtotal * (rate / 100),
                            total: prev.subtotal + (prev.subtotal * (rate / 100))
                          }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                      <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50">
                        €{formData.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Status and Payment Fields (for invoices) */}
              {formData.type === 'invoice' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          status: newStatus,
                          // Auto-set paid date if marking as paid
                          paidDate: newStatus === 'paid' && !prev.paidDate 
                            ? new Date().toISOString().split('T')[0] 
                            : prev.paidDate,
                          // Auto-generate payment link if not set and not paid
                          paymentLink: !prev.paymentLink && newStatus !== 'paid'
                            ? `${window.location.origin}/pay/${prev.invoiceNumber || 'invoice'}`
                            : prev.paymentLink
                        }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {formData.status !== 'paid' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Link
                      </label>
                      <input
                        type="text"
                        name="paymentLink"
                        value={formData.paymentLink || `${window.location.origin}/pay/${formData.invoiceNumber || 'invoice'}`}
                        onChange={handleInputChange}
                        placeholder="https://your-domain.com/pay/invoice-number"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">URL where customers can pay this invoice online</p>
                    </div>
                  )}

                  {formData.status === 'paid' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Paid Date *
                        </label>
                        <input
                          type="date"
                          name="paidDate"
                          value={formData.paidDate}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Financial Account *
                        </label>
                        <FinancialAccountSelect
                          value={formData.financialAccountId}
                          onChange={(accountId) => setFormData(prev => ({ ...prev, financialAccountId: accountId }))}
                          filterBy={['income']}
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Subscription Form */}
              {formData.type === 'subscription' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer *
                    </label>
                    <select
                      name="customerId"
                      value={formData.customerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    >
                      <option value="">Select customer...</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name || customer.company || customer.email || 'Unnamed Customer'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Plan Name *
                      </label>
                      <input
                        type="text"
                        name="planName"
                        value={formData.planName}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        placeholder="Pro Plan"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Plan Type
                      </label>
                      <select
                        name="planType"
                        value={formData.planType}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Cycle *
                      </label>
                      <select
                        name="billingCycle"
                        value={formData.billingCycle}
                        onChange={(e) => {
                          setFormData(prev => {
                            const billingCycle = e.target.value;
                            // Recalculate MRR/ARR when billing cycle changes
                            let mrr = 0;
                            if (prev.amount > 0) {
                              if (billingCycle === 'monthly') {
                                mrr = prev.amount;
                              } else if (billingCycle === 'quarterly') {
                                mrr = prev.amount / 3;
                              } else if (billingCycle === 'annual') {
                                mrr = prev.amount / 12;
                              }
                            }
                            const arr = mrr * 12;
                            
                            // Recalculate next billing date if start date is set
                            let nextBillingDate = prev.nextBillingDate;
                            if (prev.startDate) {
                              const start = new Date(prev.startDate);
                              if (billingCycle === 'monthly') {
                                start.setMonth(start.getMonth() + 1);
                                nextBillingDate = start.toISOString().split('T')[0];
                              } else if (billingCycle === 'quarterly') {
                                start.setMonth(start.getMonth() + 3);
                                nextBillingDate = start.toISOString().split('T')[0];
                              } else if (billingCycle === 'annual') {
                                start.setFullYear(start.getFullYear() + 1);
                                nextBillingDate = start.toISOString().split('T')[0];
                              }
                            }
                            
                            return { ...prev, billingCycle, mrr, arr, nextBillingDate };
                          });
                        }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        required
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (€) *
                      </label>
                      <input
                        type="text"
                        name="amount"
                        value={formData.amount === 0 ? '' : formData.amount.toString().replace('.', ',')}
                        onChange={(e) => {
                          // Handle European number format (comma as decimal separator)
                          let value = e.target.value.replace(/[^\d,]/g, ''); // Remove everything except digits and comma
                          value = value.replace(',', '.'); // Convert comma to dot for parsing
                          const amount = parseFloat(value) || 0;
                          setFormData(prev => {
                            // Calculate MRR based on billing cycle
                            let mrr = 0;
                            if (prev.billingCycle === 'monthly') {
                              mrr = amount;
                            } else if (prev.billingCycle === 'quarterly') {
                              mrr = amount / 3;
                            } else if (prev.billingCycle === 'annual') {
                              mrr = amount / 12;
                            }
                            const arr = mrr * 12;
                            
                            // Recalculate next billing date if start date is set
                            let nextBillingDate = prev.nextBillingDate;
                            if (prev.startDate) {
                              const start = new Date(prev.startDate);
                              if (prev.billingCycle === 'monthly') {
                                start.setMonth(start.getMonth() + 1);
                                nextBillingDate = start.toISOString().split('T')[0];
                              } else if (prev.billingCycle === 'quarterly') {
                                start.setMonth(start.getMonth() + 3);
                                nextBillingDate = start.toISOString().split('T')[0];
                              } else if (prev.billingCycle === 'annual') {
                                start.setFullYear(start.getFullYear() + 1);
                                nextBillingDate = start.toISOString().split('T')[0];
                              }
                            }
                            
                            return { ...prev, amount, mrr, arr, nextBillingDate };
                          });
                        }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        placeholder="9,99"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Enter amount in EUR (e.g., 9,99)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seats
                      </label>
                      <input
                        type="number"
                        name="seats"
                        value={formData.seats}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={(e) => {
                          setFormData(prev => {
                            const startDate = e.target.value;
                            const start = new Date(startDate);
                            let nextBillingDate = '';
                            
                            if (prev.billingCycle === 'monthly') {
                              start.setMonth(start.getMonth() + 1);
                              nextBillingDate = start.toISOString().split('T')[0];
                            } else if (prev.billingCycle === 'quarterly') {
                              start.setMonth(start.getMonth() + 3);
                              nextBillingDate = start.toISOString().split('T')[0];
                            } else if (prev.billingCycle === 'annual') {
                              start.setFullYear(start.getFullYear() + 1);
                              nextBillingDate = start.toISOString().split('T')[0];
                            }
                            
                            return { ...prev, startDate, nextBillingDate };
                          });
                        }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Next Billing Date
                      </label>
                      <input
                        type="date"
                        name="nextBillingDate"
                        value={formData.nextBillingDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MRR (Monthly Recurring Revenue)
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (Auto-calculated)
                        </span>
                      </label>
                      <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50">
                        €{formData.mrr.toFixed(2).replace('.', ',')}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Monthly revenue from this subscription
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ARR (Annual Recurring Revenue)
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (Auto-calculated)
                        </span>
                      </label>
                      <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50">
                        €{formData.arr.toFixed(2).replace('.', ',')}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Annual revenue (MRR × 12)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="autoRenew"
                      checked={formData.autoRenew}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Auto-renew subscription
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  style={{ backgroundColor: accentColor }}
                >
                  <FaSave className="inline mr-2" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem && editingItem.id ? 'Edit Customer' : 'New Customer'}
              </h2>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setCustomerFormData({
                    name: '',
                    company: '',
                    email: '',
                    phone: '',
                    address: '',
                    city: '',
                    country: '',
                    postalCode: '',
                    vatNumber: '',
                    accountType: 'one_time'
                  });
                  setEditingItem(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={customerFormData.company}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Company Name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="customer@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="+31 6 12345678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={customerFormData.city}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={customerFormData.postalCode}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="1234 AB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    name="country"
                    value={customerFormData.country}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Select country...</option>
                    {EU_COUNTRY_OPTIONS.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    name="vatNumber"
                    value={customerFormData.vatNumber}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, vatNumber: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="NL123456789B01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <select
                    name="accountType"
                    value={customerFormData.accountType}
                    onChange={(e) => setCustomerFormData(prev => ({ ...prev, accountType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="one_time">One-time</option>
                    <option value="subscription">Subscription</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setCustomerFormData({
                      name: '',
                      company: '',
                      email: '',
                      phone: '',
                      address: '',
                      city: '',
                      country: '',
                      postalCode: '',
                      vatNumber: '',
                      accountType: 'one_time'
                    });
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  style={{ backgroundColor: accentColor }}
                >
                  <FaSave className="inline mr-2" />
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Invoice Details</h2>
              <button
                onClick={() => {
                  setShowDetailDrawer(false);
                  setViewingItem(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-6 bg-white">
              {/* Company Header with Branding - Clean White Design */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {currentCompany?.branding?.logoUrl && (
                      <img 
                        src={currentCompany.branding.logoUrl} 
                        alt={currentCompany.name || 'Company Logo'}
                        className="w-10 h-10 rounded object-contain flex-shrink-0"
                      />
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">From</p>
                      <p className="text-lg font-bold text-gray-900" style={{ color: currentCompany?.branding?.primaryColor || accentColor }}>
                        {currentCompany?.name || 'Company'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      viewingItem.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : viewingItem.status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {viewingItem.status || 'draft'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Invoice Number</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingItem.invoiceNumber || viewingItem.id || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Customer</p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingItem.customerName || viewingItem.customer || 'No customer assigned'}
                  </p>
                  {viewingItem.customerEmail && (
                    <p className="text-sm text-gray-600 mt-1">{viewingItem.customerEmail}</p>
                  )}
                  {viewingItem.customerAddress && (
                    <p className="text-sm text-gray-600 mt-1">{viewingItem.customerAddress}</p>
                  )}
                </div>
              </div>

              {/* Connections */}
              {(viewingItem.quoteId || viewingItem.subscriptionId || viewingItem.incomeId) && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Connected To</p>
                  <div className="space-y-2">
                    {viewingItem.quoteId && (
                      <div className="flex items-center gap-2 text-sm">
                        <FaFileContract className="text-blue-600" />
                        <span className="text-gray-600">Quote:</span>
                        <span className="font-semibold text-blue-600">
                          {quotes.find(q => q.id === viewingItem.quoteId)?.quoteNumber || viewingItem.quoteId}
                        </span>
                      </div>
                    )}
                    {viewingItem.subscriptionId && (
                      <div className="flex items-center gap-2 text-sm">
                        <FaSyncAlt className="text-green-600" />
                        <span className="text-gray-600">Subscription:</span>
                        <span className="font-semibold text-green-600">
                          {subscriptions.find(s => s.id === viewingItem.subscriptionId)?.planName || viewingItem.subscriptionId}
                        </span>
                      </div>
                    )}
                    {viewingItem.incomeId && (
                      <div className="flex items-center gap-2 text-sm">
                        <FaDollarSign className="text-green-600" />
                        <span className="text-gray-600">Income Record:</span>
                        <button
                          onClick={() => {
                            window.open(`/modules/income?income=${viewingItem.incomeId}`, '_blank');
                          }}
                          className="font-semibold text-green-600 hover:text-green-800 underline"
                        >
                          View Income Record
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Invoice Date</p>
                  <p className="text-gray-900">
                    {viewingItem.invoiceDate?.toDate 
                      ? viewingItem.invoiceDate.toDate().toLocaleDateString()
                      : viewingItem.invoiceDate 
                      ? new Date(viewingItem.invoiceDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Due Date</p>
                  <p className="text-gray-900">
                    {viewingItem.dueDate?.toDate 
                      ? viewingItem.dueDate.toDate().toLocaleDateString()
                      : viewingItem.dueDate 
                      ? new Date(viewingItem.dueDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              {viewingItem.lineItems && viewingItem.lineItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Line Items</p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {viewingItem.lineItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.description || 'N/A'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.quantity || 0}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">€{parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">€{parseFloat(item.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-gray-200 pt-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">€{parseFloat(viewingItem.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {viewingItem.taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT ({viewingItem.taxRate || 0}%)</span>
                      <span className="text-gray-900">€{parseFloat(viewingItem.taxAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-1.5 mt-1.5">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">€{parseFloat(viewingItem.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information (if not paid) */}
              {viewingItem.status !== 'paid' && (
                <div 
                  className="rounded-lg p-3"
                  style={{ 
                    backgroundColor: currentCompany?.branding?.primaryColor || accentColor,
                    color: 'white'
                  }}
                >
                  <p className="text-sm font-medium mb-2">Payment Information</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={viewingItem.paymentLink || `${window.location.origin}/pay/${viewingItem.id || viewingItem.invoiceNumber}`}
                      className="flex-1 px-3 py-2 border border-white/30 rounded-lg text-sm bg-white/10 text-white placeholder-white/70"
                      style={{ color: 'white' }}
                    />
                    <button
                      onClick={() => {
                        const link = viewingItem.paymentLink || `${window.location.origin}/pay/${viewingItem.id || viewingItem.invoiceNumber}`;
                        navigator.clipboard.writeText(link);
                        alert('Payment link copied to clipboard!');
                      }}
                      className="px-3 py-2 text-sm rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-white/80 mt-2">Share this link with your customer to enable online payment</p>
                </div>
              )}

              {/* Payment Information (if paid) */}
              {viewingItem.status === 'paid' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">Payment Information</p>
                  <div className="space-y-1">
                    {viewingItem.paidDate && (
                      <p className="text-sm text-green-700">
                        Paid on: {viewingItem.paidDate?.toDate 
                          ? viewingItem.paidDate.toDate().toLocaleDateString()
                          : new Date(viewingItem.paidDate).toLocaleDateString()}
                      </p>
                    )}
                    {viewingItem.paymentMethod && (
                      <p className="text-sm text-green-700">Method: {viewingItem.paymentMethod}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Company Contact Information */}
              {(currentCompany?.phone || currentCompany?.email) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Questions or Billing Issues?</p>
                  <div className="space-y-1 text-sm text-gray-600">
                    {currentCompany.email && (
                      <p>📧 Email: <a href={`mailto:${currentCompany.email}`} className="text-blue-600 hover:underline">{currentCompany.email}</a></p>
                    )}
                    {currentCompany.phone && (
                      <p>📞 Phone: <a href={`tel:${currentCompany.phone}`} className="text-blue-600 hover:underline">{currentCompany.phone}</a></p>
                    )}
                    {currentCompany.website && (
                      <p>🌐 Website: <a href={currentCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{currentCompany.website}</a></p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingItem.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{viewingItem.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleDownloadPDF(viewingItem, 'invoice');
                  }}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <FaFilePdf className="mr-2" />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    handleSendEmail(viewingItem, 'invoice');
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FaEnvelope className="mr-2" />
                  Send Email
                </button>
                <button
                  onClick={() => {
                    // Populate form with invoice data for editing
                    const invoiceDate = viewingItem.invoiceDate?.toDate 
                      ? viewingItem.invoiceDate.toDate().toISOString().split('T')[0]
                      : viewingItem.invoiceDate 
                      ? new Date(viewingItem.invoiceDate).toISOString().split('T')[0]
                      : new Date().toISOString().split('T')[0];
                    const dueDate = viewingItem.dueDate?.toDate 
                      ? viewingItem.dueDate.toDate().toISOString().split('T')[0]
                      : viewingItem.dueDate 
                      ? new Date(viewingItem.dueDate).toISOString().split('T')[0]
                      : '';
                    const paidDate = viewingItem.paidDate?.toDate 
                      ? viewingItem.paidDate.toDate().toISOString().split('T')[0]
                      : viewingItem.paidDate 
                      ? new Date(viewingItem.paidDate).toISOString().split('T')[0]
                      : '';
                    
                    setFormData({
                      type: 'invoice',
                      customerId: viewingItem.customerId || '',
                      customerName: viewingItem.customerName || viewingItem.customer || '',
                      customerEmail: viewingItem.customerEmail || '',
                      customerAddress: viewingItem.customerAddress || '',
                      invoiceNumber: viewingItem.invoiceNumber || '',
                      invoiceDate: invoiceDate,
                      dueDate: dueDate,
                      status: viewingItem.status || 'draft',
                      lineItems: viewingItem.lineItems || [],
                      subtotal: parseFloat(viewingItem.subtotal || 0),
                      taxRate: parseFloat(viewingItem.taxRate || 21),
                      taxAmount: parseFloat(viewingItem.taxAmount || 0),
                      total: parseFloat(viewingItem.total || 0),
                      currency: viewingItem.currency || 'EUR',
                      notes: viewingItem.notes || '',
                      terms: viewingItem.terms || '',
                      paidDate: paidDate,
                      paidAmount: parseFloat(viewingItem.paidAmount || 0),
                      paymentMethod: viewingItem.paymentMethod || '',
                      financialAccountId: viewingItem.financialAccountId || ''
                    });
                    setEditingItem(viewingItem);
                    setShowDetailDrawer(false);
                    setShowAddModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <FaEdit className="mr-2" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceTracker;

