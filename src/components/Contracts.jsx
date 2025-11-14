/**
 * CONTRACTS MANAGEMENT COMPONENT
 * 
 * Allows owners/managers to:
 * - View all contracts
 * - Add new contracts
 * - Edit contract details
 * - Delete contracts
 * - Link contracts to vendors
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanyContracts,
  addCompanyContract,
  updateCompanyContract,
  deleteCompanyContract,
  subscribeToCompanyVendors
} from '../firebase';
import {
  FaFileContract,
  FaPlusCircle,
  FaEdit,
  FaTrash,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaCalendarAlt,
  FaEuroSign,
  FaLink,
  FaBuilding
} from 'react-icons/fa';

const Contracts = () => {
  const { currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [deletingContract, setDeletingContract] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    vendorId: '',
    vendorName: '',
    status: 'active',
    currency: 'EUR',
    value: '',
    url: '',
    startDate: '',
    endDate: '',
    notes: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'expired', label: 'Expired', color: 'red' },
    { value: 'terminated', label: 'Terminated', color: 'gray' }
  ];
  
  const currencyOptions = ['EUR', 'USD', 'GBP', 'CHF', 'SEK'];
  
  // OWNER/MANAGER ONLY: Contracts are sensitive
  const canManageContracts = userRole === 'owner' || userRole === 'manager';
  
  // If not authorized, show access denied message
  if (!canManageContracts) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FaFileContract className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">
            Contract management is restricted to company owners and managers only.
          </p>
        </div>
      </div>
    );
  }
  
  // Load contracts when component mounts or company changes
  useEffect(() => {
    if (currentCompanyId) {
      loadContracts();
    }
  }, [currentCompanyId]);
  
  const loadContracts = async () => {
    if (!currentCompanyId) {
      setContracts([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const contractsList = await getCompanyContracts(currentCompanyId);
      setContracts(contractsList);
    } catch (error) {
      console.error('Error loading contracts:', error);
      setError('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!currentCompanyId) {
      setVendors([]);
      return;
    }
    
    let unsubscribe = null;
    
    try {
      unsubscribe = subscribeToCompanyVendors(currentCompanyId, (vendorProfiles = []) => {
        const sorted = [...vendorProfiles].sort((a, b) => (b?.usageCount || 0) - (a?.usageCount || 0));
        setVendors(sorted);
      });
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentCompanyId]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleVendorChange = (e) => {
    const vendorId = e.target.value;
    const selectedVendor = vendors.find(v => v.id === vendorId);
    
    setFormData(prev => ({
      ...prev,
      vendorId: vendorId || '',
      vendorName: selectedVendor?.displayName || selectedVendor?.name || ''
    }));
  };
  
  const handleAddContract = () => {
    setEditingContract(null);
    setFormData({
      name: '',
      reference: '',
      vendorId: '',
      vendorName: '',
      status: 'active',
      currency: 'EUR',
      value: '',
      url: '',
      startDate: '',
      endDate: '',
      notes: ''
    });
    setError('');
    setSuccess('');
    setShowAddModal(true);
  };
  
  const handleEditContract = (contract) => {
    setEditingContract(contract);
    setFormData({
      name: contract.name || '',
      reference: contract.reference || '',
      vendorId: contract.vendorId || '',
      vendorName: contract.vendorName || '',
      status: contract.status || 'active',
      currency: contract.currency || 'EUR',
      value: contract.value !== null && contract.value !== undefined ? contract.value.toString() : '',
      url: contract.url || '',
      startDate: contract.startDate || '',
      endDate: contract.endDate || '',
      notes: contract.notes || ''
    });
    setError('');
    setSuccess('');
    setShowEditModal(true);
  };
  
  const handleDeleteContract = (contract) => {
    setError('');
    setSuccess('');
    setDeletingContract(contract);
    setShowDeleteConfirm(true);
  };
  
  const handleSaveContract = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!formData.name.trim()) {
      setError('Contract name is required');
      return;
    }
    
    setSaving(true);
    
    try {
      const contractData = {
        ...formData,
        value: formData.value ? parseFloat(formData.value) : null
      };
      
      if (editingContract) {
        // Update existing contract
        await updateCompanyContract(currentCompanyId, editingContract.id, contractData);
        setSuccess('Contract updated successfully');
      } else {
        // Add new contract
        await addCompanyContract(currentCompanyId, currentUser.uid, contractData);
        setSuccess('Contract added successfully');
      }
      
      await loadContracts();
      
      setTimeout(() => {
        setShowAddModal(false);
        setShowEditModal(false);
        setFormData({
          name: '',
          reference: '',
          vendorId: '',
          vendorName: '',
          status: 'active',
          currency: 'EUR',
          value: '',
          url: '',
          startDate: '',
          endDate: '',
          notes: ''
        });
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Error saving contract:', error);
      setError(error.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!deletingContract) return;

    setSaving(true);
    try {
      await deleteCompanyContract(currentCompanyId, deletingContract.id);
      setSuccess('Contract deleted successfully');
      await loadContracts();
      setTimeout(() => {
        setShowDeleteConfirm(false);
        setDeletingContract(null);
        setSuccess('');
      }, 1000);
    } catch (error) {
      console.error('Error deleting contract:', error);
      setError(error.message || 'Failed to delete contract');
    } finally {
      setSaving(false);
    }
  };
  
  const getStatusColor = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    const colorMap = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800'
    };
    return colorMap[statusConfig?.color || 'gray'] || colorMap.gray;
  };
  
  const formatCurrency = (value, currency = 'EUR') => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency
    }).format(value);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Contracts</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage vendor contracts and agreements
          </p>
        </div>
        {canManageContracts && (
          <button
            onClick={handleAddContract}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FaPlusCircle />
            Add Contract
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
      
      {/* Contracts List */}
      {contracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FaFileContract className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Contracts</h3>
          <p className="text-gray-600 mb-4">
            Get started by adding your first contract or agreement.
          </p>
          {canManageContracts && (
            <button
              onClick={handleAddContract}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Contract
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 flex-shrink-0">
                    <FaFileContract className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate" title={contract.name || contract.reference}>
                      {contract.name || contract.reference || 'Unnamed Contract'}
                    </h3>
                    {contract.reference && contract.reference !== contract.name && (
                      <p className="text-xs text-gray-500 truncate" title={contract.reference}>
                        {contract.reference}
                      </p>
                    )}
                  </div>
                </div>
                {canManageContracts && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEditContract(contract)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Contract"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    {userRole === 'owner' && (
                      <button
                        onClick={() => handleDeleteContract(contract)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Contract"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {contract.vendorName && (
                  <div className="flex items-center gap-2">
                    <FaBuilding className="w-3 h-3 text-gray-400" />
                    <p className="text-sm text-gray-700 truncate" title={contract.vendorName}>
                      {contract.vendorName}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                    {statusOptions.find(s => s.value === contract.status)?.label || contract.status}
                  </span>
                </div>
                
                {contract.value !== null && contract.value !== undefined && (
                  <div className="flex items-center gap-2">
                    <FaEuroSign className="w-3 h-3 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(contract.value, contract.currency)}
                    </p>
                  </div>
                )}
                
                {(contract.startDate || contract.endDate) && (
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-600">
                      {contract.startDate ? formatDate(contract.startDate) : '—'} – {contract.endDate ? formatDate(contract.endDate) : '—'}
                    </p>
                  </div>
                )}
                
                {contract.url && (
                  <div className="flex items-center gap-2">
                    <FaLink className="w-3 h-3 text-gray-400" />
                    <a
                      href={contract.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 truncate"
                      title={contract.url}
                    >
                      View Contract
                    </a>
                  </div>
                )}
                
                {contract.notes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-xs text-gray-700 line-clamp-2">{contract.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingContract ? 'Edit Contract' : 'Add New Contract'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveContract} className="px-6 py-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., MSP Master Agreement"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CONTRACT-2025-001"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <select
                      name="vendorId"
                      value={formData.vendorId}
                      onChange={handleVendorChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select vendor (optional)</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.displayName || vendor.name || vendor.normalizedName || 'Unnamed Vendor'}
                        </option>
                      ))}
                    </select>
                    {vendors.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        No vendors found. Vendors are created automatically when you add expenses.
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {currencyOptions.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Value
                    </label>
                    <input
                      type="number"
                      name="value"
                      value={formData.value}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about this contract..."
                  />
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaCheck className="w-4 h-4" />
                      {editingContract ? 'Update' : 'Add'} Contract
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingContract && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Delete Contract</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete the contract <strong>"{deletingContract.name || deletingContract.reference || 'Unnamed Contract'}"</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingContract(null);
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash className="w-4 h-4" />
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

export default Contracts;

