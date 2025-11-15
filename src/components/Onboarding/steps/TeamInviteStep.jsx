/**
 * TEAM INVITE STEP
 * 
 * Step 4: Invite team members (optional)
 */

import React, { useState } from 'react';
import { useCompany } from '../../../contexts/CompanyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { inviteUserToCompany } from '../../../firebase';
import { FaUsers, FaEnvelope, FaCheckCircle } from 'react-icons/fa';

const TeamInviteStep = ({ onNext, onPrevious }) => {
  const { currentCompanyId } = useCompany();
  const { currentUser } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState([]);
  const [error, setError] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentCompanyId || !currentUser) {
      setError('Please enter a valid email address');
      return;
    }

    setInviting(true);
    setError('');

    try {
      await inviteUserToCompany(
        currentCompanyId,
        inviteEmail.trim(),
        inviteRole,
        currentUser.uid
      );

      setInvitedEmails([...invitedEmails, { email: inviteEmail.trim(), role: inviteRole }]);
      setInviteEmail('');
      setInviteRole('employee');
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleContinue = () => {
    onNext({
      invitedCount: invitedEmails.length,
      invitedEmails: invitedEmails.map(i => i.email)
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Invite Your Team
        </h2>
        <p className="text-gray-600">
          Add team members now or skip this step and invite them later.
        </p>
      </div>

      <div className="space-y-6">
        {/* Invitation Form */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-[#D4F5EF] rounded-lg flex items-center justify-center flex-shrink-0">
              <FaEnvelope className="w-6 h-6 text-[#005C70]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Send Invitations</h3>
              <p className="text-sm text-gray-600 mb-4">
                Invite team members by email. They'll receive an invitation to join your company.
              </p>

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="colleague@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
                    disabled={inviting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
                    disabled={inviting}
                  >
                    <option value="employee">Employee</option>
                    <option value="dataEntryClerk">Data Entry Clerk</option>
                    <option value="accountant">Accountant</option>
                    <option value="developer">Software Engineer</option>
                    <option value="marketingManager">Marketing Manager</option>
                    <option value="manager">Manager</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    You can change roles later in Team Management.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="w-full px-6 py-3 bg-[#00BFA6] text-white rounded-lg font-semibold hover:bg-[#019884] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Invited List */}
        {invitedEmails.length > 0 && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
              <FaCheckCircle className="w-5 h-5" />
              Invitations Sent ({invitedEmails.length})
            </h3>
            <ul className="space-y-2">
              {invitedEmails.map((invite, index) => (
                <li key={index} className="flex items-center justify-between bg-white rounded-lg px-4 py-2">
                  <span className="text-gray-700">{invite.email}</span>
                  <span className="px-2 py-1 bg-[#D4F5EF] text-[#2F6F63] rounded text-xs font-medium capitalize">
                    {invite.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FaUsers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> You can always invite more team members later from Settings → Team Management.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamInviteStep;

