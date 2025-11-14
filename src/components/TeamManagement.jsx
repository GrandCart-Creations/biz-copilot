/**
 * TEAM MANAGEMENT COMPONENT
 * 
 * Allows owners/managers to:
 * - View all team members
 * - Invite users by email
 * - Change user roles
 * - Remove users from company
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanyMembers,
  getCompanyInvitations,
  getUserInvitations,
  inviteUserToCompany,
  cancelInvitation,
  updateUserRole,
  removeUserFromCompany,
  acceptInvitation,
  addUserDirectlyToCompany
} from '../firebase';
import { cleanupDuplicateUsers, findAllDuplicateUsers } from '../utils/cleanupDuplicates';
import { fixUserCompanyAccess } from '../utils/fixUserCompanyAccess';
import {
  FaUsers,
  FaEnvelope,
  FaUserShield,
  FaUserTie,
  FaUser,
  FaUserGraduate,
  FaTrash,
  FaEdit,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaSearch,
  FaExclamationTriangle,
  FaInfoCircle,
  FaBullhorn
} from 'react-icons/fa';

const TeamManagement = () => {
  const { currentCompanyId, currentCompany, userRole } = useCompany();
  const { currentUser } = useAuth();
  
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('employee');
  const [updatingRole, setUpdatingRole] = useState(false);
  
  const [removingUser, setRemovingUser] = useState(null);
  const [removing, setRemoving] = useState(false);
  
  const [userPendingInvites, setUserPendingInvites] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserRole, setAddUserRole] = useState('employee');
  const [addUserUid, setAddUserUid] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(null);
  const [lookingUpUid, setLookingUpUid] = useState(false);
  const [uidLookupError, setUidLookupError] = useState('');
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [cleaningUp, setCleaningUp] = useState(false);

  // Check if user can manage team (owner or manager)
  const canManageTeam = userRole === 'owner' || userRole === 'manager';

  // Check for duplicates on component mount
  useEffect(() => {
    if (currentCompanyId && canManageTeam) {
      checkForDuplicates();
    }
  }, [currentCompanyId, canManageTeam]);

  const checkForDuplicates = async () => {
    try {
      const membersData = await getCompanyMembers(currentCompanyId);
      
      // Group by email to find duplicates
      const emailGroups = {};
      membersData.forEach(member => {
        const email = (member.email || '').toLowerCase().trim();
        if (email) {
          if (!emailGroups[email]) {
            emailGroups[email] = [];
          }
          emailGroups[email].push(member);
        }
      });
      
      // Find emails with multiple entries
      const duplicatesFound = [];
      Object.keys(emailGroups).forEach(email => {
        if (emailGroups[email].length > 1) {
          duplicatesFound.push({
            email,
            entries: emailGroups[email]
          });
        }
      });
      
      if (duplicatesFound.length > 0) {
        setDuplicates(duplicatesFound);
        setShowCleanupModal(true);
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }
  };

  // Auto-fix duplicates with invalid UIDs (like 647411)
  const autoFixDuplicates = async () => {
    if (!currentCompanyId || !currentUser) return;
    
    try {
      const membersData = await getCompanyMembers(currentCompanyId);
      
      // Find entries with invalid UIDs (short numeric ones)
      for (const member of membersData) {
        const userId = member.userId;
        const email = member.email;
        const isInvalidUid = userId && (userId.length < 20 || /^\d+$/.test(userId));
        
        if (isInvalidUid && email) {
          // Try to find the correct UID from Firebase Auth
          // For now, we'll use the current user's pattern as reference
          // In production, you'd query Firebase Auth Admin SDK
          
          // Check if email matches current user (they can fix their own)
          if (email.toLowerCase() === currentUser.email?.toLowerCase()) {
            console.log(`[autoFixDuplicates] Found invalid UID ${userId} for ${email} - would need correct UID to fix`);
            // We can't auto-fix without the correct UID, so show the modal
          }
        }
      }
    } catch (error) {
      console.error('Error auto-fixing duplicates:', error);
    }
  };

  // Load team members and invitations
  useEffect(() => {
    if (currentCompanyId) {
      loadTeamData();
    }
  }, [currentCompanyId]);

  // Load pending invitations for current user
  useEffect(() => {
    if (currentUser?.email) {
      loadUserInvitations();
    }
  }, [currentUser]);

  const loadTeamData = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    try {
      const [membersData, invitationsData] = await Promise.all([
        getCompanyMembers(currentCompanyId),
        getCompanyInvitations(currentCompanyId)
      ]);
      
      setMembers(membersData);
      
      // Filter to show only pending invitations
      // Also filter out invitations for users who are already team members
      const pendingInvitations = invitationsData.filter(inv => {
        if (inv.status !== 'pending') return false;
        
        // Check if this email already has a user document (is already a member)
        const emailToCheck = (inv.email || '').toLowerCase().trim();
        const isAlreadyMember = membersData.some(member => 
          (member.email || '').toLowerCase().trim() === emailToCheck
        );
        
        // If already a member, auto-cancel the invitation
        if (isAlreadyMember) {
          console.log(`[TeamManagement] Auto-cancelling invitation for ${inv.email} - user is already a member`);
          // Optionally auto-cancel here, but for now just filter it out
          // The invitation will be cancelled on next load or when user accepts
          return false;
        }
        
        return true;
      });
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserInvitations = async () => {
    if (!currentUser?.email) return;
    
    try {
      const invites = await getUserInvitations(currentUser.email);
      setUserPendingInvites(invites);
    } catch (error) {
      // Silently handle errors - getUserInvitations now returns empty array instead of throwing
      // This prevents console spam and UI blocking
      if (error.code !== 'permission-denied') {
        console.warn('Error loading user invitations (non-critical):', error.message);
      }
      setUserPendingInvites([]); // Set empty array on error
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentCompanyId || !currentUser) return;

    setInviting(true);
    try {
      await inviteUserToCompany(
        currentCompanyId,
        inviteEmail.trim(),
        inviteRole,
        currentUser.uid,
        inviteFullName.trim()
      );
      
      // Show success message (in a real app, you'd send email here)
      alert(`Invitation sent to ${inviteEmail.trim()}!\n\nNote: In production, an email will be sent automatically. For now, users can be added directly.`);
      
      // Reset form
      setInviteEmail('');
      setInviteFullName('');
      setInviteRole('employee');
      setShowInviteModal(false);
      
      // Reload invitations
      await loadTeamData();
    } catch (error) {
      console.error('Error inviting user:', error);
      alert(`Failed to send invitation: ${error.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!currentCompanyId) return;
    
    try {
      await cancelInvitation(currentCompanyId, invitationId);
      await loadTeamData();
    } catch (error) {
      console.error('Error canceling invitation:', error);
      alert(`Failed to cancel invitation: ${error.message}`);
    }
  };

  const handleUpdateRole = async () => {
    if (!currentCompanyId || !editingUser) return;
    
    setUpdatingRole(true);
    try {
      await updateUserRole(currentCompanyId, editingUser.userId, newRole);
      await loadTeamData();
      setShowRoleModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating role:', error);
      alert(`Failed to update role: ${error.message}`);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!currentCompanyId || !removingUser) return;
    
    setRemoving(true);
    try {
      await removeUserFromCompany(currentCompanyId, removingUser.userId);
      await loadTeamData();
      setShowRemoveConfirm(false);
      setRemovingUser(null);
    } catch (error) {
      console.error('Error removing user:', error);
      alert(`Failed to remove user: ${error.message}`);
    } finally {
      setRemoving(false);
    }
  };

  const handleAcceptInvitation = async (invitation) => {
    if (!currentUser) return;
    
    setAcceptingInvite(invitation.id);
    try {
      await acceptInvitation(
        invitation.companyId,
        invitation.id,
        currentUser.uid,
        currentUser.email
      );
      
      // Refresh data
      await loadUserInvitations();
      if (currentCompanyId) {
        await loadTeamData();
      }
      
      alert(`Successfully joined ${invitation.companyName}!\n\nYou can now switch to this company from the company selector.`);
      
      // If this is the current company, reload team data
      if (invitation.companyId === currentCompanyId) {
        await loadTeamData();
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert(`Failed to accept invitation: ${error.message}`);
    } finally {
      setAcceptingInvite(null);
    }
  };

  // Try to find user UID by checking if they exist in Firestore (as a workaround)
  // Note: This won't work if user hasn't signed up yet, but helps if they have
  const handleLookupUid = async () => {
    if (!addUserEmail.trim()) {
      setUidLookupError('Please enter an email address first');
      return;
    }

    setLookingUpUid(true);
    setUidLookupError('');
    
    try {
      // Try to find user by checking if they have any companies or data
      // This is a workaround since we can't query Firebase Auth from client
      // In production, you'd use a Cloud Function with Admin SDK
      
      // Check if this email is already a member of any company
      const companiesRef = collection(db, 'companies');
      const companiesSnapshot = await getDocs(companiesRef);
      
      let foundUid = null;
      const emailToFind = addUserEmail.toLowerCase().trim();
      
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const usersRef = collection(db, 'companies', companyId, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          if (userData.email && userData.email.toLowerCase() === emailToFind) {
            foundUid = userDoc.id; // The document ID is the Firebase UID
            break;
          }
        }
        
        if (foundUid) break;
      }
      
      if (foundUid) {
        setAddUserUid(foundUid);
        setUidLookupError('');
      } else {
        setUidLookupError('User not found in existing companies. They may need to sign up first, or you can find their UID in Firebase Console → Authentication → Users.');
      }
    } catch (error) {
      console.error('Error looking up UID:', error);
      setUidLookupError('Could not lookup UID. Please find it manually in Firebase Console.');
    } finally {
      setLookingUpUid(false);
    }
  };

  const handleAddUserDirectly = async (e) => {
    e.preventDefault();
    if (!addUserUid.trim() || !addUserEmail.trim() || !currentCompanyId) return;

    setAddingUser(true);
    setUidLookupError('');
    try {
      await addUserDirectlyToCompany(
        currentCompanyId,
        addUserUid.trim(),
        addUserEmail.trim(),
        addUserRole
      );
      
      alert(`User ${addUserEmail.trim()} added successfully!`);
      
      // Reset form
      setAddUserEmail('');
      setAddUserUid('');
      setAddUserRole('employee');
      setShowAddUserModal(false);
      
      // Reload team data
      await loadTeamData();
    } catch (error) {
      console.error('Error adding user:', error);
      alert(`Failed to add user: ${error.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <FaUserShield className="w-4 h-4" />;
      case 'manager':
        return <FaUserTie className="w-4 h-4" />;
      case 'accountant':
        return <FaUserGraduate className="w-4 h-4" />;
      case 'marketingManager':
        return <FaBullhorn className="w-4 h-4" />;
      default:
        return <FaUser className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-[#D4F5EF] text-[#184E55]';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'accountant':
        return 'bg-green-100 text-green-800';
      case 'marketingManager':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!canManageTeam) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <FaUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">
          Only owners and managers can manage team members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Pending Invitations - Only show invitations for OTHER companies (not current company) */}
      {(() => {
        // Filter to only show invitations for OTHER companies (security: clear separation)
        const otherCompanyInvites = userPendingInvites.filter(inv => 
          inv.companyId !== currentCompanyId
        );
        
        return otherCompanyInvites.length > 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Your Pending Invitations from Other Companies</h3>
            <p className="text-xs text-blue-800 mb-3">
              You have pending invitations from other companies. Switch to that company's environment to accept them.
            </p>
            <div className="space-y-2">
              {otherCompanyInvites.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200"
                >
                  <div className="flex items-center gap-3">
                    <FaEnvelope className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{invitation.companyName}</p>
                      <p className="text-sm text-gray-500">Role: {invitation.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptInvitation(invitation)}
                    disabled={acceptingInvite === invitation.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {acceptingInvite === invitation.id ? (
                      <>
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-4 h-4" />
                        Accept
                      </>
                    )}
                  </button>
              </div>
            ))}
          </div>
        </div>
        ) : null;
      })()}

      {/* Header with Invite Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage team members and their access</p>
        </div>
        <div className="flex gap-2">
          {canManageTeam && (
            <>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                title="Add existing user directly (requires their User ID)"
              >
                <FaUsers className="w-4 h-4" />
                Add User
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <FaEnvelope className="w-4 h-4" />
                Invite User
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-200"
              >
                <div className="flex items-center gap-3">
                  <FaEnvelope className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-sm text-gray-500">Role: {invitation.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvitation(invitation.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {members.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FaUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No team members yet.</p>
              <p className="text-sm text-gray-500 mt-2">Invite users to get started.</p>
            </div>
          ) : (
            members.map((member, index) => {
              // Use userId as key, but add index as fallback for duplicates
              const uniqueKey = `${member.userId}-${index}`;
              const isCurrentUser = member.userId === currentUser?.uid;
              const isOwner = member.role === 'owner';
              const canEdit = (userRole === 'owner' && !isOwner) || (userRole === 'manager' && member.role === 'employee');
              const canRemove = userRole === 'owner' && !isOwner && !isCurrentUser;

              return (
                <div
                  key={uniqueKey}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {getRoleIcon(member.role)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {member.email}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-gray-500">(You)</span>
                            )}
                          </p>
                          {/* Show warning if this looks like a duplicate */}
                          {members.filter(m => 
                            m.email.toLowerCase() === member.email.toLowerCase() && 
                            m.userId !== member.userId
                          ).length > 0 && (
                            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200" title="Duplicate email detected - different User ID">
                              ⚠️ Duplicate
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(member.role)}`}>
                            {getRoleIcon(member.role)}
                            {member.role === 'marketingManager' ? 'Marketing Manager' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                          {member.joinedAt && (
                            <span className="text-xs text-gray-500">
                              Joined {member.joinedAt.toDate ? new Date(member.joinedAt.toDate()).toLocaleDateString() : 'Recently'}
                            </span>
                          )}
                          {/* Show User ID for debugging duplicates */}
                          <span className="text-xs text-gray-400 font-mono" title={`User ID: ${member.userId}`}>
                            ID: {member.userId.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingUser(member);
                            setNewRole(member.role);
                            setShowRoleModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Change role"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                      )}
                      {canRemove && (
                        <button
                          onClick={() => {
                            setRemovingUser(member);
                            setShowRemoveConfirm(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Remove from company"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Invite User to Team</h3>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteFullName('');
                    setInviteRole('employee');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleInviteUser} className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employee">Employee</option>
                  <option value="accountant">Accountant</option>
                  <option value="marketingManager">Marketing Manager</option>
                  <option value="manager">Manager</option>
                  {userRole === 'owner' && <option value="owner">Owner</option>}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  {inviteRole === 'employee' && 'Can view and create own expenses'}
                  {inviteRole === 'accountant' && 'Can view expenses and income, export reports'}
                  {inviteRole === 'marketingManager' && 'Full marketing control, can view financial data and reports'}
                  {inviteRole === 'manager' && 'Can manage expenses, income, and reports'}
                  {inviteRole === 'owner' && 'Full access to all features and settings'}
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteRole('employee');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={inviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  disabled={inviting}
                >
                  {inviting ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaEnvelope className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Change User Role</h3>
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setEditingUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Changing role for: <strong>{editingUser.email}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employee">Employee</option>
                  <option value="accountant">Accountant</option>
                  <option value="marketingManager">Marketing Manager</option>
                  <option value="manager">Manager</option>
                  {userRole === 'owner' && <option value="owner">Owner</option>}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={updatingRole}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  disabled={updatingRole}
                >
                  {updatingRole ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaCheck className="w-4 h-4" />
                      Update Role
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove User Confirmation Modal */}
      {showRemoveConfirm && removingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Remove User from Company</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to remove <strong>{removingUser.email}</strong> from this company?
              </p>
              <p className="text-sm text-gray-600 mb-6">
                They will lose access to all company data. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveConfirm(false);
                    setRemovingUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={removing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                  disabled={removing}
                >
                  {removing ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <FaTrash className="w-4 h-4" />
                      Remove User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Directly Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Add Existing User</h3>
                <button
                  onClick={() => {
                    setShowAddUserModal(false);
                    setAddUserEmail('');
                    setAddUserUid('');
                    setAddUserRole('employee');
                    setUidLookupError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddUserDirectly} className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Email
                </label>
                <input
                  type="email"
                  value={addUserEmail}
                  onChange={(e) => setAddUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Firebase User ID (UID)
                  </label>
                  <button
                    type="button"
                    onClick={handleLookupUid}
                    disabled={!addUserEmail.trim() || lookingUpUid}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {lookingUpUid ? (
                      <>
                        <FaSpinner className="w-3 h-3 animate-spin" />
                        Looking up...
                      </>
                    ) : (
                      <>
                        <FaSearch className="w-3 h-3" />
                        Auto-find UID
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={addUserUid}
                  onChange={(e) => {
                    setAddUserUid(e.target.value);
                    setUidLookupError('');
                  }}
                  placeholder="Firebase Auth UID (or use Auto-find button)"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {uidLookupError && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-start gap-2">
                    <FaExclamationTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>{uidLookupError}</div>
                  </div>
                )}
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <FaInfoCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Quick Guide:</strong>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Try the "Auto-find UID" button above (works if user has signed up)</li>
                        <li>Or find it manually: Firebase Console → Authentication → Users → Search by email</li>
                        <li>Or ask the user to sign up first, then use the invitation system</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={addUserRole}
                  onChange={(e) => setAddUserRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employee">Employee</option>
                  <option value="accountant">Accountant</option>
                  <option value="marketingManager">Marketing Manager</option>
                  <option value="manager">Manager</option>
                  {userRole === 'owner' && <option value="owner">Owner</option>}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setAddUserEmail('');
                    setAddUserUid('');
                    setAddUserRole('employee');
                    setUidLookupError('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={addingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
                  disabled={addingUser}
                >
                  {addingUser ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <FaUsers className="w-4 h-4" />
                      Add User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Cleanup Modal */}
      {showCleanupModal && duplicates.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">⚠️ Duplicate Users Detected</h3>
                <button
                  onClick={() => {
                    setShowCleanupModal(false);
                    setDuplicates([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                Found duplicate user entries with the same email but different User IDs. The entry with the invalid User ID (like "647411") should be removed. The correct entry has a longer Firebase Auth UID.
              </p>
              
              {duplicates.map((dup, idx) => (
                <div key={idx} className="mb-6 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Email: {dup.email}</h4>
                  <div className="space-y-2">
                    {dup.entries.map((entry, entryIdx) => {
                      // Try to determine which is the correct Firebase Auth UID
                      // Firebase Auth UIDs are typically 28 characters long (A-Za-z0-9)
                      const looksLikeValidUid = entry.userId && entry.userId.length > 20 && /^[A-Za-z0-9]+$/.test(entry.userId);
                      const isCurrentUser = entry.userId === currentUser?.uid;
                      const isInvalidUid = entry.userId && (entry.userId.length < 20 || /^\d+$/.test(entry.userId)); // Short or all digits = likely wrong
                      
                      return (
                        <div
                          key={entryIdx}
                          className={`p-3 border rounded-lg ${
                            looksLikeValidUid || isCurrentUser
                              ? 'border-green-300 bg-green-50'
                              : isInvalidUid
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                User ID: <span className="font-mono text-xs">{entry.userId}</span>
                              </p>
                              <p className="text-sm text-gray-600">Role: {entry.role}</p>
                              {entry.joinedAt && (
                                <p className="text-xs text-gray-500">
                                  Joined: {entry.joinedAt.toDate ? new Date(entry.joinedAt.toDate()).toLocaleDateString() : 'Unknown'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {(looksLikeValidUid || isCurrentUser) && (
                                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">✓ Keep This</span>
                              )}
                              {isInvalidUid && (
                                <button
                                  onClick={async () => {
                                    if (!currentCompanyId) return;
                                    setCleaningUp(true);
                                    try {
                                      await removeUserFromCompany(currentCompanyId, entry.userId);
                                      await loadTeamData();
                                      await checkForDuplicates(); // Re-check after cleanup
                                      alert(`Removed duplicate entry with invalid User ID: ${entry.userId}`);
                                      if (duplicates.length === 0) {
                                        setShowCleanupModal(false);
                                      }
                                    } catch (error) {
                                      console.error('Error removing duplicate:', error);
                                      alert(`Failed to remove duplicate: ${error.message}`);
                                    } finally {
                                      setCleaningUp(false);
                                    }
                                  }}
                                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                  disabled={cleaningUp}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCleanupModal(false);
                    setDuplicates([]);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;

