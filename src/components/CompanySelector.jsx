// src/components/CompanySelector.jsx
// Company Switcher Component for Multi-Company Support

import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { FaBuilding, FaPlus, FaCheck, FaTrash } from 'react-icons/fa';

const CompanySelector = () => {
  const { companies, currentCompany, userRole, switchCompany, createCompany, updateCompanyName, deleteCompany, loading } = useCompany();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompanyName, setEditingCompanyName] = useState('');

  const handleSwitchCompany = async (companyId) => {
    await switchCompany(companyId);
    setShowDropdown(false);
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    const nameToCreate = newCompanyName.trim();
    if (!nameToCreate) return;

    try {
      setNewCompanyName(''); // Clear input immediately
      await createCompany(nameToCreate);
      setShowCreateModal(false);
      setShowDropdown(false);
      // Company context will automatically reload and show the new company
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Failed to create company. Please try again.');
      // Restore input on error
      setNewCompanyName(nameToCreate);
    }
  };

  const handleCreateCompanyFromModal = async (companyName) => {
    if (!companyName.trim()) return;

    try {
      await createCompany(companyName.trim());
      setShowCreateModal(false);
      setNewCompanyName('');
      // Company context will automatically reload and show the new company
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Failed to create company. Please try again.');
    }
  };

  // Show minimal placeholder if still loading, but don't show pulsating animation
  if (loading) {
    return (
      <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
        <div className="flex items-center gap-2">
          <FaBuilding className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  // If no company exists yet, show a create button
  if (!currentCompany) {
    return (
      <>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <FaPlus className="w-4 h-4" />
          <span>Create Company</span>
        </button>
        {showCreateModal && (
          <CreateCompanyModal
            show={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setNewCompanyName('');
            }}
            onCreate={handleCreateCompanyFromModal}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative">
      {/* Company Selector Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <FaBuilding className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-gray-900">{currentCompany.name || 'My Business'}</span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          ></div>

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              {/* Current Company Indicator */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Your Companies
              </div>

              {/* Company List */}
              <div className="space-y-1">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      currentCompany.id === company.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <button
                      onClick={() => handleSwitchCompany(company.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <FaBuilding className="w-4 h-4" />
                      <span className="font-medium">{company.name}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      {currentCompany.id === company.id && (
                        <>
                          <FaCheck className="w-4 h-4 text-blue-600" />
                          {/* Only owners can edit company name */}
                          {userRole === 'owner' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCompanyName(company.name);
                                setShowEditModal(true);
                                setShowDropdown(false);
                              }}
                              className="p-1 hover:bg-blue-100 rounded text-blue-600"
                              title="Edit company name"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                      {/* Only owners can delete companies */}
                      {userRole === 'owner' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCompanyId(company.id);
                            setShowDeleteConfirm(true);
                            setShowDropdown(false);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Delete company"
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Create New Company Button - OWNER ONLY */}
              {userRole === 'owner' && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowCreateModal(true);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <FaPlus className="w-4 h-4" />
                    <span className="font-medium">Create New Company</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit Company Modal */}
      {showEditModal && currentCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowEditModal(false);
          setEditingCompanyName('');
        }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Company Name</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!editingCompanyName.trim()) return;
              try {
                await updateCompanyName(currentCompany.id, editingCompanyName.trim());
                setShowEditModal(false);
                setEditingCompanyName('');
              } catch (error) {
                console.error('Error updating company name:', error);
                alert('Failed to update company name. Please try again.');
              }
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={editingCompanyName}
                  onChange={(e) => setEditingCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCompanyName('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowCreateModal(false);
          setNewCompanyName('');
        }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Company</h2>
            <form onSubmit={handleCreateCompany}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  This will be your primary business. You can create more companies later.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCompanyName('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingCompanyId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Company</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this company? This action cannot be undone. All expenses and data associated with this company will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingCompanyId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteCompany(deletingCompanyId);
                    setShowDeleteConfirm(false);
                    setDeletingCompanyId(null);
                  } catch (error) {
                    console.error('Error deleting company:', error);
                    alert(`Failed to delete company: ${error.message}`);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Also handle modal when showing "Create Company" button (no company state)
const CreateCompanyModal = ({ show, onClose, onCreate }) => {
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    await onCreate(companyName.trim());
    setCompanyName('');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Company</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              This will be your primary business. You can create more companies later.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySelector;

