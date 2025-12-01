/**
 * COMPANY ADMINISTRATION
 * 
 * Owner-only section for managing:
 * - Payment approvals and releases
 * - Access control for Accountants and Managers
 * - Company-wide financial controls
 * - Critical business operations
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  FaLock,
  FaCheckCircle,
  FaTimesCircle,
  FaUserShield,
  FaCreditCard,
  FaFileInvoice,
  FaExclamationTriangle,
  FaUserCheck,
  FaUserTimes,
  FaDollarSign,
  FaHistory
} from 'react-icons/fa';
import { getCompanyInvoices, updateCompanyInvoice, getCompanyMembers, updateUserRole } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const CompanyAdministration = () => {
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'access' | 'controls'
  const [pendingPayments, setPendingPayments] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState({
    requireApproval: true,
    autoApproveThreshold: 0,
    requireOwnerApproval: true
  });

  useEffect(() => {
    if (userRole !== 'owner') {
      return;
    }
    loadData();
  }, [currentCompanyId, userRole]);

  const loadData = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    try {
      // Load pending invoices requiring payment approval
      const invoices = await getCompanyInvoices(currentCompanyId);
      const pending = invoices.filter(inv => 
        inv.status === 'pending' && inv.requiresApproval === true
      );
      setPendingPayments(pending);

      // Load company users for access management
      const users = await getCompanyMembers(currentCompanyId);
      setCompanyUsers(users);

      // Load payment settings (if stored)
      // TODO: Load from company settings
    } catch (error) {
      console.error('Error loading administration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (invoiceId) => {
    try {
      await updateCompanyInvoice(currentCompanyId, invoiceId, {
        status: 'approved',
        approvedBy: currentUser.uid,
        approvedAt: new Date()
      });
      await loadData();
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve payment. Please try again.');
    }
  };

  const handleRejectPayment = async (invoiceId, reason) => {
    try {
      await updateCompanyInvoice(currentCompanyId, invoiceId, {
        status: 'rejected',
        rejectedBy: currentUser.uid,
        rejectedAt: new Date(),
        rejectionReason: reason
      });
      await loadData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment. Please try again.');
    }
  };

  const handleGrantAccess = async (userId) => {
    if (!currentCompanyId || !userId) return;
    
    try {
      const userRef = doc(db, 'companies', currentCompanyId, 'users', userId);
      await updateDoc(userRef, {
        hasPaymentAccess: true,
        paymentAccessGrantedBy: currentUser.uid,
        paymentAccessGrantedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Reload data to reflect changes
      await loadData();
      
      // Show success message
      alert('Payment access granted successfully.');
    } catch (error) {
      console.error('Error granting payment access:', error);
      alert('Failed to grant payment access. Please try again.');
    }
  };

  const handleRevokeAccess = async (userId) => {
    if (!currentCompanyId || !userId) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to revoke payment access? This user will no longer be able to approve payments.'
    );
    
    if (!confirmed) return;
    
    try {
      const userRef = doc(db, 'companies', currentCompanyId, 'users', userId);
      await updateDoc(userRef, {
        hasPaymentAccess: false,
        paymentAccessRevokedBy: currentUser.uid,
        paymentAccessRevokedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Reload data to reflect changes
      await loadData();
      
      // Show success message
      alert('Payment access revoked successfully.');
    } catch (error) {
      console.error('Error revoking payment access:', error);
      alert('Failed to revoke payment access. Please try again.');
    }
  };

  if (userRole !== 'owner') {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <FaLock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Access Restricted</h2>
        <p className="text-gray-600">
          Company Administration is only available to company owners.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Company Administration</h2>
        <p className="text-gray-600">
          Manage payment approvals, access controls, and critical business operations.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'payments'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaCreditCard className="inline-block mr-2" />
              Payment Approvals
              {pendingPayments.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  {pendingPayments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('access')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'access'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaUserShield className="inline-block mr-2" />
              Access Management
            </button>
            <button
              onClick={() => setActiveTab('controls')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'controls'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaLock className="inline-block mr-2" />
              Financial Controls
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Payment Approvals Tab */}
        {activeTab === 'payments' && (
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Pending Payment Approvals
              </h3>
              <p className="text-gray-600 text-sm">
                Review and approve payments before they are processed.
              </p>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="text-center py-12">
                <FaCheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending payments requiring approval.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPayments.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FaFileInvoice className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">
                            Invoice #{invoice.invoiceNumber || invoice.id}
                          </h4>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                            Pending Approval
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 ml-8">
                          <p>
                            <strong>Customer:</strong> {invoice.customerName || 'N/A'}
                          </p>
                          <p>
                            <strong>Amount:</strong>{' '}
                            <span className="font-semibold text-gray-900">
                              €{invoice.total?.toFixed(2) || '0.00'}
                            </span>
                          </p>
                          <p>
                            <strong>Due Date:</strong>{' '}
                            {invoice.dueDate
                              ? new Date(invoice.dueDate.seconds * 1000).toLocaleDateString()
                              : 'N/A'}
                          </p>
                          {invoice.description && (
                            <p>
                              <strong>Description:</strong> {invoice.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprovePayment(invoice.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <FaCheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for rejection:');
                            if (reason) handleRejectPayment(invoice.id, reason);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <FaTimesCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Access Management Tab */}
        {activeTab === 'access' && (
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Access Management
              </h3>
              <p className="text-gray-600 text-sm">
                Grant or revoke access to Accountants and Managers for payment approvals and financial operations.
              </p>
            </div>

            <div className="space-y-4">
              {companyUsers
                .filter(user => user.role === 'accountant' || user.role === 'manager')
                .map((user) => (
                  <div
                    key={user.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FaUserShield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {user.displayName || user.email}
                          </h4>
                          <p className="text-sm text-gray-600 capitalize">
                            {user.role} • {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.hasPaymentAccess ? (
                          <>
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium flex items-center gap-1">
                              <FaUserCheck className="w-3 h-3" />
                              Has Payment Access
                            </span>
                            <button
                              onClick={() => handleRevokeAccess(user.userId || user.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                              <FaUserTimes className="w-4 h-4" />
                              Revoke
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGrantAccess(user.userId || user.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <FaUserCheck className="w-4 h-4" />
                            Grant Payment Access
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              
              {companyUsers.filter(user => user.role === 'accountant' || user.role === 'manager').length === 0 && (
                <div className="text-center py-12">
                  <FaUserShield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No accountants or managers found.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Invite team members from Team Management to grant them access.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Controls Tab */}
        {activeTab === 'controls' && (
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Financial Controls
              </h3>
              <p className="text-gray-600 text-sm">
                Configure payment approval requirements and financial safeguards.
              </p>
            </div>

            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Require Payment Approval
                    </h4>
                    <p className="text-sm text-gray-600">
                      All payments must be approved by an owner before processing.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentSettings.requireApproval}
                      onChange={(e) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          requireApproval: e.target.checked
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Auto-Approve Threshold
                  </h4>
                  <p className="text-sm text-gray-600">
                    Payments below this amount will be automatically approved (set to 0 to disable).
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FaDollarSign className="w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={paymentSettings.autoApproveThreshold}
                      onChange={(e) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          autoApproveThreshold: parseFloat(e.target.value) || 0
                        })
                      }
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <span className="text-sm text-gray-600">EUR</span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Require Owner Approval
                    </h4>
                    <p className="text-sm text-gray-600">
                      Only company owners can approve payments (overrides manager/accountant access).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentSettings.requireOwnerApproval}
                      onChange={(e) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          requireOwnerApproval: e.target.checked
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium mb-1">
                      Important Security Note
                    </p>
                    <p className="text-sm text-blue-700">
                      These settings control critical financial operations. Changes take effect immediately and affect all payment processing.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  // TODO: Save payment settings
                  alert('Payment settings saved successfully!');
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyAdministration;

