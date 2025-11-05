/**
 * COMPANY ONBOARDING SETTINGS
 * 
 * Allows company owners to configure onboarding content for new team members
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { getCompanyOnboarding, updateCompanyOnboarding, getCompanyMembers } from '../firebase';
import { FaSave, FaSpinner, FaCheckCircle, FaExclamationCircle, FaUserTie, FaUserShield, FaUsers, FaFileInvoice } from 'react-icons/fa';

const CompanyOnboarding = () => {
  const { currentCompanyId, userRole } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  
  const [onboarding, setOnboarding] = useState(null);

  useEffect(() => {
    loadOnboardingData();
  }, [currentCompanyId]);

  const loadOnboardingData = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const data = await getCompanyOnboarding(currentCompanyId);
      const members = await getCompanyMembers(currentCompanyId);
      setTeamMembers(members);
      
      // Always set onboarding with defaults if data doesn't exist
      // Ensure all roles have proper structure
      const defaultSchedule = {
        owner: { startTime: '', endTime: '', notes: '' },
        manager: { startTime: '', endTime: '', notes: '' },
        accountant: { startTime: '', endTime: '', notes: '' },
        employee: { startTime: '', endTime: '', notes: '' }
      };
      
      const defaultDuties = {
        owner: [],
        manager: [],
        accountant: [],
        employee: []
      };
      
      const defaultChainOfCommand = {
        owner: '',
        manager: '',
        accountant: ''
      };
      
      // Merge with existing data, ensuring all roles exist
      const schedule = data?.schedule || {};
      const duties = data?.duties || {};
      const chainOfCommand = data?.chainOfCommand || {};
      
      setOnboarding({
        chainOfCommand: {
          ...defaultChainOfCommand,
          ...chainOfCommand
        },
        duties: {
          ...defaultDuties,
          ...duties,
          // Ensure all roles have arrays
          owner: duties.owner || [],
          manager: duties.manager || [],
          accountant: duties.accountant || [],
          employee: duties.employee || []
        },
        schedule: {
          ...defaultSchedule,
          ...schedule,
          // Ensure all roles have schedule objects
          owner: schedule.owner || defaultSchedule.owner,
          manager: schedule.manager || defaultSchedule.manager,
          accountant: schedule.accountant || defaultSchedule.accountant,
          employee: schedule.employee || defaultSchedule.employee
        }
      });
    } catch (err) {
      console.error('Error loading onboarding data:', err);
      setError('Failed to load onboarding settings');
      // Set defaults even on error so UI can render
      setOnboarding({
        chainOfCommand: {
          owner: '',
          manager: '',
          accountant: ''
        },
        duties: {
          owner: [],
          manager: [],
          accountant: [],
          employee: []
        },
        schedule: {
          owner: { startTime: '', endTime: '', notes: '' },
          manager: { startTime: '', endTime: '', notes: '' },
          accountant: { startTime: '', endTime: '', notes: '' },
          employee: { startTime: '', endTime: '', notes: '' }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentCompanyId) {
      setError('No company selected');
      return;
    }

    if (!onboarding) {
      setError('Onboarding data not loaded');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateCompanyOnboarding(currentCompanyId, onboarding);
      setSuccess('✅ Onboarding settings saved successfully!');
      setTimeout(() => setSuccess(''), 5000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saving onboarding:', err);
      setError(err.message || 'Failed to save onboarding settings');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const addDuty = (role) => {
    if (!onboarding) return;
    setOnboarding(prev => ({
      ...prev,
      duties: {
        ...prev.duties,
        [role]: [...(prev.duties[role] || []), '']
      }
    }));
  };

  const updateDuty = (role, index, value) => {
    if (!onboarding) return;
    setOnboarding(prev => ({
      ...prev,
      duties: {
        ...prev.duties,
        [role]: (prev.duties[role] || []).map((d, i) => i === index ? value : d)
      }
    }));
  };

  const removeDuty = (role, index) => {
    if (!onboarding) return;
    setOnboarding(prev => ({
      ...prev,
      duties: {
        ...prev.duties,
        [role]: (prev.duties[role] || []).filter((_, i) => i !== index)
      }
    }));
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <FaUserShield className="w-5 h-5" />;
      case 'manager': return <FaUserTie className="w-5 h-5" />;
      case 'accountant': return <FaFileInvoice className="w-5 h-5" />;
      default: return <FaUsers className="w-5 h-5" />;
    }
  };

  const getRoleName = (role) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (userRole !== 'owner') {
    return (
      <div className="text-center py-12">
        <FaExclamationCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">Only company owners can manage onboarding settings.</p>
      </div>
    );
  }

  if (loading || !onboarding) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Team Member Onboarding</h2>
        <p className="text-sm text-gray-600">
          Customize the welcome experience for new team members. They'll see this information when they first join your company.
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-3">
          <FaCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-center gap-3">
          <FaExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Chain of Command */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Chain of Command</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add instructions for each role about who team members should contact for questions.
        </p>
        <div className="space-y-4">
          {['owner', 'manager', 'accountant'].map((role) => (
            <div key={role} className="flex items-start gap-4">
              <div className="flex items-center gap-2 text-gray-700 w-32">
                {getRoleIcon(role)}
                <span className="font-medium capitalize">{getRoleName(role)}</span>
              </div>
              <textarea
                value={onboarding.chainOfCommand[role] || ''}
                onChange={(e) => setOnboarding(prev => ({
                  ...prev,
                  chainOfCommand: {
                    ...prev.chainOfCommand,
                    [role]: e.target.value
                  }
                }))}
                placeholder={`e.g., Contact for company-wide decisions, billing questions, etc.`}
                rows={2}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Duties by Role */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Duties & Responsibilities</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define specific duties for each role. These will be shown to new team members during onboarding.
        </p>
        <div className="space-y-6">
          {['owner', 'manager', 'accountant', 'employee'].map((role) => (
            <div key={role} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                {getRoleIcon(role)}
                <h4 className="font-semibold text-gray-900 capitalize">{getRoleName(role)}</h4>
              </div>
              <div className="space-y-2">
                {(onboarding.duties[role] || []).map((duty, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={duty}
                      onChange={(e) => updateDuty(role, idx, e.target.value)}
                      placeholder="e.g., Review and approve expense reports"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => removeDuty(role, idx)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addDuty(role)}
                  className="w-full px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                >
                  + Add Duty
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Work Schedule */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Schedule</h3>
        <p className="text-sm text-gray-600 mb-4">
          Set standard work hours for each role (optional).
        </p>
        <div className="space-y-6">
          {['owner', 'manager', 'accountant', 'employee'].map((role) => (
            <div key={role} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                {getRoleIcon(role)}
                <h4 className="font-semibold text-gray-900 capitalize">{getRoleName(role)}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={onboarding.schedule[role]?.startTime || ''}
                    onChange={(e) => setOnboarding(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        [role]: {
                          ...(prev.schedule[role] || {}),
                          startTime: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={onboarding.schedule[role]?.endTime || ''}
                    onChange={(e) => setOnboarding(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        [role]: {
                          ...(prev.schedule[role] || {}),
                          endTime: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={onboarding.schedule[role]?.notes || ''}
                  onChange={(e) => setOnboarding(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      [role]: {
                        ...(prev.schedule[role] || {}),
                        notes: e.target.value
                      }
                    }
                  }))}
                  placeholder="e.g., Flexible hours, remote work available, etc."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FaSave className="w-4 h-4" />
              Save Onboarding Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CompanyOnboarding;

