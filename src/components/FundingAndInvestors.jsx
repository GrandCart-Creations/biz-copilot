/**
 * FUNDING & INVESTORS MANAGEMENT COMPONENT
 * 
 * Allows owners/managers to:
 * - View and manage funding sources (seed funds, loans, grants)
 * - Manage investor details and relationships
 * - Track equity, agreements, and documents
 * - Link funding to financial accounts
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanyFunding,
  addFunding,
  updateFunding,
  deleteFunding,
  getCompanyInvestors,
  addInvestor,
  updateInvestor,
  deleteInvestor
} from '../firebase';
import FinancialAccountSelect from './FinancialAccountSelect';
import {
  FaSeedling,
  FaHandHoldingUsd,
  FaUserTie,
  FaFileContract,
  FaPlusCircle,
  FaEdit,
  FaTrash,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaMoneyBillWave,
  FaChartLine,
  FaInfoCircle,
  FaUniversity,
  FaEnvelope,
  FaPhone,
  FaFileAlt
} from 'react-icons/fa';

const FundingAndInvestors = () => {
  const { currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('funding'); // 'funding' | 'investors'
  const [funding, setFunding] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [editingFunding, setEditingFunding] = useState(null);
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  
  // Forms
  const [fundingForm, setFundingForm] = useState({
    type: 'seed_fund',
    name: '',
    amount: '',
    currency: 'EUR',
    dateReceived: new Date().toISOString().split('T')[0],
    equityPercentage: '',
    interestRate: '',
    financialAccountId: '',
    agreementType: '',
    signedDate: '',
    investorContact: { name: '', email: '', phone: '' },
    terms: '',
    restrictions: '',
    maturityDate: '',
    status: 'active',
    notes: ''
  });
  
  const [investorForm, setInvestorForm] = useState({
    name: '',
    type: 'Angel',
    totalInvested: '',
    currency: 'EUR',
    equityPercentage: '',
    boardSeat: false,
    votingRights: false,
    contact: { name: '', email: '', phone: '' },
    notes: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fundingTypes = [
    { value: 'seed_fund', label: 'Seed Fund' },
    { value: 'angel_investor', label: 'Angel Investor' },
    { value: 'vc_round', label: 'VC Round' },
    { value: 'bank_loan', label: 'Bank Loan' },
    { value: 'grant', label: 'Grant' },
    { value: 'personal_loan', label: 'Personal Loan' },
    { value: 'other', label: 'Other' }
  ];
  
  const investorTypes = [
    { value: 'Angel', label: 'Angel Investor' },
    { value: 'VC', label: 'Venture Capital' },
    { value: 'Family', label: 'Family' },
    { value: 'Friend', label: 'Friend' },
    { value: 'Other', label: 'Other' }
  ];
  
  const agreementTypes = [
    'Term Sheet',
    'SAFE',
    'Loan Agreement',
    'Investment Agreement',
    'Grant Agreement',
    'Other'
  ];
  
  const canManage = userRole === 'owner' || userRole === 'manager';
  
  // Load data
  useEffect(() => {
    if (currentCompanyId) {
      loadData();
    }
  }, [currentCompanyId, activeTab]);
  
  const loadData = async () => {
    if (!currentCompanyId) return;
    
    try {
      setLoading(true);
      if (activeTab === 'funding') {
        const fundingList = await getCompanyFunding(currentCompanyId);
        setFunding(fundingList);
      } else {
        const investorsList = await getCompanyInvestors(currentCompanyId);
        setInvestors(investorsList);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFundingInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('investorContact.')) {
      const field = name.split('.')[1];
      setFundingForm(prev => ({
        ...prev,
        investorContact: {
          ...prev.investorContact,
          [field]: value
        }
      }));
    } else {
      setFundingForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  
  const handleInvestorInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('contact.')) {
      const field = name.split('.')[1];
      setInvestorForm(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          [field]: value
        }
      }));
    } else {
      setInvestorForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  
  const handleAddFunding = () => {
    setEditingFunding(null);
    setFundingForm({
      type: 'seed_fund',
      name: '',
      amount: '',
      currency: 'EUR',
      dateReceived: new Date().toISOString().split('T')[0],
      equityPercentage: '',
      interestRate: '',
      financialAccountId: '',
      agreementType: '',
      signedDate: '',
      investorContact: { name: '', email: '', phone: '' },
      terms: '',
      restrictions: '',
      maturityDate: '',
      status: 'active',
      notes: ''
    });
    setError('');
    setSuccess('');
    setShowFundingModal(true);
  };
  
  const handleEditFunding = (fundingItem) => {
    setEditingFunding(fundingItem);
    setFundingForm({
      type: fundingItem.type || 'seed_fund',
      name: fundingItem.name || '',
      amount: fundingItem.amount || '',
      currency: fundingItem.currency || 'EUR',
      dateReceived: fundingItem.dateReceived || new Date().toISOString().split('T')[0],
      equityPercentage: fundingItem.equityPercentage || '',
      interestRate: fundingItem.interestRate || '',
      financialAccountId: fundingItem.financialAccountId || '',
      agreementType: fundingItem.agreementType || '',
      signedDate: fundingItem.signedDate || '',
      investorContact: fundingItem.investorContact || { name: '', email: '', phone: '' },
      terms: fundingItem.terms || '',
      restrictions: fundingItem.restrictions || '',
      maturityDate: fundingItem.maturityDate || '',
      status: fundingItem.status || 'active',
      notes: fundingItem.notes || ''
    });
    setError('');
    setSuccess('');
    setShowFundingModal(true);
  };
  
  const handleSaveFunding = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!fundingForm.name.trim()) {
      setError('Funding source name is required');
      return;
    }
    
    setSaving(true);
    
    try {
      if (editingFunding) {
        await updateFunding(currentCompanyId, editingFunding.id, fundingForm);
        setSuccess('Funding updated successfully');
      } else {
        await addFunding(currentCompanyId, currentUser.uid, fundingForm);
        setSuccess('Funding added successfully');
      }
      
      await loadData();
      setTimeout(() => {
        setShowFundingModal(false);
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Error saving funding:', error);
      setError(error.message || 'Failed to save funding');
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddInvestor = () => {
    setEditingInvestor(null);
    setInvestorForm({
      name: '',
      type: 'Angel',
      totalInvested: '',
      currency: 'EUR',
      equityPercentage: '',
      boardSeat: false,
      votingRights: false,
      contact: { name: '', email: '', phone: '' },
      notes: ''
    });
    setError('');
    setSuccess('');
    setShowInvestorModal(true);
  };
  
  const handleEditInvestor = (investor) => {
    setEditingInvestor(investor);
    setInvestorForm({
      name: investor.name || '',
      type: investor.type || 'Angel',
      totalInvested: investor.totalInvested || '',
      currency: investor.currency || 'EUR',
      equityPercentage: investor.equityPercentage || '',
      boardSeat: investor.boardSeat || false,
      votingRights: investor.votingRights || false,
      contact: investor.contact || { name: '', email: '', phone: '' },
      notes: investor.notes || ''
    });
    setError('');
    setSuccess('');
    setShowInvestorModal(true);
  };
  
  const handleSaveInvestor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!investorForm.name.trim()) {
      setError('Investor name is required');
      return;
    }
    
    setSaving(true);
    
    try {
      if (editingInvestor) {
        await updateInvestor(currentCompanyId, editingInvestor.id, investorForm);
        setSuccess('Investor updated successfully');
      } else {
        await addInvestor(currentCompanyId, currentUser.uid, investorForm);
        setSuccess('Investor added successfully');
      }
      
      await loadData();
      setTimeout(() => {
        setShowInvestorModal(false);
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Error saving investor:', error);
      setError(error.message || 'Failed to save investor');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!deletingItem) return;
    
    setSaving(true);
    try {
      if (deletingItem.type === 'funding') {
        await deleteFunding(currentCompanyId, deletingItem.id);
      } else {
        await deleteInvestor(currentCompanyId, deletingItem.id);
      }
      setSuccess('Deleted successfully');
      await loadData();
      setTimeout(() => {
        setShowDeleteConfirm(false);
        setDeletingItem(null);
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Error deleting:', error);
      setError(error.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };
  
  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
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
          <h2 className="text-2xl font-bold text-gray-900">Funding & Investors</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage seed funding, loans, investors, and financial agreements
          </p>
        </div>
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
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('funding')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'funding'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaSeedling className="w-4 h-4" />
                Funding
              </div>
            </button>
            <button
              onClick={() => setActiveTab('investors')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'investors'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaUserTie className="w-4 h-4" />
                Investors
              </div>
            </button>
          </nav>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'funding' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Funding Sources</h3>
              {canManage && (
                <button
                  onClick={handleAddFunding}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FaPlusCircle />
                  Add Funding
                </button>
              )}
            </div>
            
            {funding.length === 0 ? (
              <div className="text-center py-12">
                <FaHandHoldingUsd className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Funding Sources</h3>
                <p className="text-gray-600 mb-4">
                  Track seed funds, loans, and other funding sources.
                </p>
                {canManage && (
                  <button
                    onClick={handleAddFunding}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Your First Funding Source
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {funding.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FaSeedling className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-500 capitalize">
                            {item.type.replace('_', ' ')}
                          </p>
                          <p className="text-xl font-bold text-green-600 mt-1">
                            {formatCurrency(item.amount, item.currency)}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditFunding(item)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingItem({ type: 'funding', id: item.id, name: item.name });
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Date Received</p>
                        <p className="text-gray-900 font-medium">
                          {item.dateReceived ? new Date(item.dateReceived).toLocaleDateString('nl-NL') : 'N/A'}
                        </p>
                      </div>
                      {item.equityPercentage > 0 && (
                        <div>
                          <p className="text-gray-500">Equity</p>
                          <p className="text-gray-900 font-medium">{item.equityPercentage}%</p>
                        </div>
                      )}
                      {item.interestRate > 0 && (
                        <div>
                          <p className="text-gray-500">Interest Rate</p>
                          <p className="text-gray-900 font-medium">{item.interestRate}%</p>
                        </div>
                      )}
                      {item.maturityDate && (
                        <div>
                          <p className="text-gray-500">Maturity Date</p>
                          <p className="text-gray-900 font-medium">
                            {new Date(item.maturityDate).toLocaleDateString('nl-NL')}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">Status</p>
                        <span className={`px-2 py-1 text-xs rounded ${
                          item.status === 'active' ? 'bg-green-100 text-green-700' :
                          item.status === 'repaid' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    
                    {item.investorContact?.name && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-2">Contact</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="text-gray-700">{item.investorContact.name}</span>
                          {item.investorContact.email && (
                            <span className="text-gray-500">{item.investorContact.email}</span>
                          )}
                          {item.investorContact.phone && (
                            <span className="text-gray-500">{item.investorContact.phone}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {item.terms && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Terms</p>
                        <p className="text-sm text-gray-700">{item.terms}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'investors' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Investors</h3>
              {canManage && (
                <button
                  onClick={handleAddInvestor}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FaPlusCircle />
                  Add Investor
                </button>
              )}
            </div>
            
            {investors.length === 0 ? (
              <div className="text-center py-12">
                <FaUserTie className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Investors</h3>
                <p className="text-gray-600 mb-4">
                  Track investor relationships, equity, and communications.
                </p>
                {canManage && (
                  <button
                    onClick={handleAddInvestor}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Your First Investor
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {investors.map((investor) => (
                  <div
                    key={investor.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FaUserTie className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{investor.name}</h4>
                          <p className="text-sm text-gray-500">{investor.type} Investor</p>
                          <div className="flex gap-4 mt-2">
                            <div>
                              <p className="text-xs text-gray-500">Total Invested</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(investor.totalInvested, investor.currency)}
                              </p>
                            </div>
                            {investor.equityPercentage > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">Equity</p>
                                <p className="text-lg font-bold text-purple-600">
                                  {investor.equityPercentage}%
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditInvestor(investor)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingItem({ type: 'investor', id: investor.id, name: investor.name });
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                      {(investor.boardSeat || investor.votingRights) && (
                        <div className="col-span-full">
                          <div className="flex gap-4">
                            {investor.boardSeat && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                Board Seat
                              </span>
                            )}
                            {investor.votingRights && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                Voting Rights
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {investor.contact?.name && (
                        <div>
                          <p className="text-gray-500">Contact Name</p>
                          <p className="text-gray-900 font-medium">{investor.contact.name}</p>
                        </div>
                      )}
                      {investor.contact?.email && (
                        <div>
                          <p className="text-gray-500">Email</p>
                          <p className="text-gray-900 font-medium">{investor.contact.email}</p>
                        </div>
                      )}
                      {investor.contact?.phone && (
                        <div>
                          <p className="text-gray-500">Phone</p>
                          <p className="text-gray-900 font-medium">{investor.contact.phone}</p>
                        </div>
                      )}
                    </div>
                    
                    {investor.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{investor.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Add/Edit Funding Modal */}
      {showFundingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingFunding ? 'Edit Funding' : 'Add Funding Source'}
              </h3>
              <button
                onClick={() => {
                  setShowFundingModal(false);
                  setError('');
                  setSuccess('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveFunding} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Funding Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="type"
                        value={fundingForm.type}
                        onChange={handleFundingInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {fundingTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name/Source <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={fundingForm.name}
                        onChange={handleFundingInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Seed Round 1, ING Bank Loan"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={fundingForm.amount}
                        onChange={handleFundingInputChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        name="currency"
                        value={fundingForm.currency}
                        onChange={handleFundingInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date Received <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="dateReceived"
                        value={fundingForm.dateReceived}
                        onChange={handleFundingInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <FinancialAccountSelect
                      value={fundingForm.financialAccountId}
                      onChange={(e) => {
                        setFundingForm(prev => ({
                          ...prev,
                          financialAccountId: e.target.value
                        }));
                      }}
                      filterBy={['funding', 'income']}
                      label="Financial Account (where funds were deposited)"
                      required={false}
                      showBalance={true}
                    />
                  </div>
                </div>
              </div>
              
              {/* Investment/Loan Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Investment/Loan Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  {(fundingForm.type === 'seed_fund' || fundingForm.type === 'angel_investor' || fundingForm.type === 'vc_round') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Equity Percentage (%)
                      </label>
                      <input
                        type="number"
                        name="equityPercentage"
                        value={fundingForm.equityPercentage}
                        onChange={handleFundingInputChange}
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  
                  {(fundingForm.type === 'bank_loan' || fundingForm.type === 'personal_loan') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interest Rate (%)
                      </label>
                      <input
                        type="number"
                        name="interestRate"
                        value={fundingForm.interestRate}
                        onChange={handleFundingInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  
                  {(fundingForm.type === 'bank_loan' || fundingForm.type === 'personal_loan') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maturity Date
                      </label>
                      <input
                        type="date"
                        name="maturityDate"
                        value={fundingForm.maturityDate}
                        onChange={handleFundingInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={fundingForm.status}
                      onChange={handleFundingInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="repaid">Repaid</option>
                      <option value="converted">Converted</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Investor/Contact Details */}
              {(fundingForm.type === 'angel_investor' || fundingForm.type === 'vc_round') && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Investor Contact</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        name="investorContact.name"
                        value={fundingForm.investorContact.name}
                        onChange={handleFundingInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Investor name"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="investorContact.email"
                          value={fundingForm.investorContact.email}
                          onChange={handleFundingInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="investor@example.com"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          name="investorContact.phone"
                          value={fundingForm.investorContact.phone}
                          onChange={handleFundingInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="+31612345678"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Agreement Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Agreement Details</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agreement Type
                      </label>
                      <select
                        name="agreementType"
                        value={fundingForm.agreementType}
                        onChange={handleFundingInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select...</option>
                        {agreementTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Signed Date
                      </label>
                      <input
                        type="date"
                        name="signedDate"
                        value={fundingForm.signedDate}
                        onChange={handleFundingInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Terms & Conditions
                    </label>
                    <textarea
                      name="terms"
                      value={fundingForm.terms}
                      onChange={handleFundingInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 5% equity, convertible note, board seat"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restrictions
                    </label>
                    <textarea
                      name="restrictions"
                      value={fundingForm.restrictions}
                      onChange={handleFundingInputChange}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any restrictions or special conditions"
                    />
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={fundingForm.notes}
                  onChange={handleFundingInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes or context"
                />
              </div>
              
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
                    setShowFundingModal(false);
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
                      {editingFunding ? 'Update Funding' : 'Add Funding'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add/Edit Investor Modal */}
      {showInvestorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingInvestor ? 'Edit Investor' : 'Add Investor'}
              </h3>
              <button
                onClick={() => {
                  setShowInvestorModal(false);
                  setError('');
                  setSuccess('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveInvestor} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Investor Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={investorForm.name}
                        onChange={handleInvestorInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Jane Angel Investor"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Investor Type
                      </label>
                      <select
                        name="type"
                        value={investorForm.type}
                        onChange={handleInvestorInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {investorTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Invested
                      </label>
                      <input
                        type="number"
                        name="totalInvested"
                        value={investorForm.totalInvested}
                        onChange={handleInvestorInputChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        name="currency"
                        value={investorForm.currency}
                        onChange={handleInvestorInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Equity Percentage (%)
                      </label>
                      <input
                        type="number"
                        name="equityPercentage"
                        value={investorForm.equityPercentage}
                        onChange={handleInvestorInputChange}
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Rights & Governance */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Rights & Governance</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="boardSeat"
                      checked={investorForm.boardSeat}
                      onChange={handleInvestorInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Board Seat</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="votingRights"
                      checked={investorForm.votingRights}
                      onChange={handleInvestorInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Voting Rights</span>
                  </label>
                </div>
              </div>
              
              {/* Contact Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      name="contact.name"
                      value={investorForm.contact.name}
                      onChange={handleInvestorInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contact person name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="contact.email"
                        value={investorForm.contact.email}
                        onChange={handleInvestorInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="investor@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="contact.phone"
                        value={investorForm.contact.phone}
                        onChange={handleInvestorInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+31612345678"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={investorForm.notes}
                  onChange={handleInvestorInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes about this investor"
                />
              </div>
              
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
                    setShowInvestorModal(false);
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
                      {editingInvestor ? 'Update Investor' : 'Add Investor'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete {deletingItem.type === 'funding' ? 'Funding' : 'Investor'}?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deletingItem.name}</strong>? 
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
                  setDeletingItem(null);
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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

export default FundingAndInvestors;

