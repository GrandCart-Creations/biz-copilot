import React, { useState } from 'react';
import { FaDownload, FaTrash, FaFileExport, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { exportUserData, deleteUserData, downloadUserData } from '../utils/gdpr';
import { logAuditEvent, AUDIT_EVENTS } from '../utils/auditLog';

const GDPRTools = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await downloadUserData(currentUser.uid);
      
      await logAuditEvent(AUDIT_EVENTS.DATA_EXPORT, {
        userId: currentUser.uid,
        email: currentUser.email
      }, 'success');

      setSuccess('Your data has been downloaded successfully.');
    } catch (err) {
      setError('Failed to export data. Please try again.');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      await deleteUserData(currentUser.uid);
      
      await logAuditEvent(AUDIT_EVENTS.DATA_EXPORT, {
        userId: currentUser.uid,
        email: currentUser.email,
        action: 'account_deletion'
      }, 'warning');

      setSuccess('Your account and all data have been deleted. You will be logged out.');
      
      // Logout user after delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      setError('Failed to delete account. Please contact support.');
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Data Privacy & GDPR
        </h2>
        <p className="text-gray-600 mb-8">
          Under GDPR, you have the right to access, export, and delete your personal data.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Export Data Section */}
        <div className="mb-8 p-6 border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                <FaFileExport className="inline mr-2 text-blue-600" />
                Export Your Data (GDPR Article 15)
              </h3>
              <p className="text-gray-600 mb-4">
                Download a complete copy of all your data stored in Biz-CoPilot, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                <li>User profile information</li>
                <li>All expenses and financial records</li>
                <li>Bank accounts and payment methods</li>
                <li>Uploaded files and attachments</li>
                <li>Audit logs (last 90 days)</li>
              </ul>
              <p className="text-sm text-gray-500">
                The data will be exported as a JSON file that you can save locally.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaDownload className="mr-2" />
            {loading ? 'Exporting...' : 'Download My Data'}
          </button>
        </div>

        {/* Delete Account Section */}
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start mb-4">
            <FaExclamationTriangle className="text-red-600 text-2xl mr-3 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Delete Account & All Data (GDPR Article 17)
              </h3>
              <p className="text-red-800 mb-4">
                <strong>Warning:</strong> This action cannot be undone. Deleting your account will permanently remove:
              </p>
              <ul className="list-disc list-inside text-red-800 mb-4 space-y-1">
                <li>All your expense records</li>
                <li>All uploaded files and attachments</li>
                <li>Your user profile</li>
                <li>Account settings and preferences</li>
              </ul>
              <p className="text-sm text-red-700 mb-4">
                This action is irreversible. Consider exporting your data first if you might need it later.
              </p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <FaTrash className="mr-2" />
              Request Account Deletion
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg">
                <p className="font-semibold text-red-900 mb-2">
                  Are you absolutely sure?
                </p>
                <p className="text-red-800 text-sm mb-4">
                  Type <strong>DELETE</strong> in the field below to confirm:
                </p>
                <input
                  type="text"
                  id="deleteConfirm"
                  placeholder="Type DELETE to confirm"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg mb-4"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={async () => {
                    const confirmInput = document.getElementById('deleteConfirm');
                    if (confirmInput?.value === 'DELETE') {
                      await handleDeleteAccount();
                    } else {
                      setError('Please type DELETE exactly to confirm deletion.');
                    }
                  }}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <FaTrash className="mr-2" />
                  {loading ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
          <p className="text-sm text-gray-600">
            If you have questions about your data rights or need assistance, please contact our support team at{' '}
            <a href="mailto:privacy@biz-copilot.nl" className="text-blue-600 hover:underline">
              privacy@biz-copilot.nl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GDPRTools;

