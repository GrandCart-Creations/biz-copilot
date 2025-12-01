import React, { useEffect, useMemo, useState } from 'react';
import {
  getCompanyMembers,
  getPeopleProfile,
  getPeopleProfiles,
  savePeopleProfile,
  uploadPeopleAttachment,
  removePeopleAttachment
} from '../firebase';
import { useCompany } from '../contexts/CompanyContext';
import PersonWorkspace from './PeopleWorkspace/PersonWorkspace';
import { FaCheckCircle, FaClipboardList, FaFileUpload, FaFolderOpen, FaShieldAlt, FaTasks, FaBullseye, FaUser } from 'react-icons/fa';

const defaultProfile = {
  fullName: '',
  preferredName: '',
  email: '',
  role: '',
  employmentType: 'Full-time',
  department: '',
  manager: '',
  startDate: '',
  responsibilities: '',
  notes: '',
  onboarding: {
    orientation: false,
    paperwork: false,
    systems: false,
    training: false,
    probation: false
  },
  attachments: []
};

const workspaceSections = [
  {
    title: 'Company Administration',
    categories: [
      { name: 'KvK & Legal', description: 'Registration, permits, contracts' },
      { name: 'Taxes & Accounting', description: 'Bookkeeping, returns, correspondence' },
      { name: 'Banking & Payments', description: 'Accounts, invoices, receipts' },
      { name: 'Insurance', description: 'Business, liability, health coverage' }
    ]
  },
  {
    title: 'Financial Management',
    categories: [
      { name: 'Expenses', description: 'Receipts, invoices, subscriptions' },
      { name: 'Budgets & Forecasts', description: 'Planning spreadsheets and reviews' },
      { name: 'Investments & Funding', description: 'Future investors, grants, loans' }
    ]
  },
  {
    title: 'Operations & Office',
    categories: [
      { name: 'Office Admin', description: 'Contracts, subscriptions, utilities' },
      { name: 'Employees/Admin', description: 'Contracts, NDAs, CVs' },
      { name: 'Suppliers/Partners', description: 'Service agreements and contacts' }
    ]
  },
  {
    title: 'Projects & Development',
    categories: [
      { name: 'App Initiatives', description: 'Design files, tech notes, launch plans' },
      { name: 'Shared Assets', description: 'UI kits, icons, reusable code snippets' }
    ]
  },
  {
    title: 'Marketing & Branding',
    categories: [
      { name: 'Branding', description: 'Guidelines, fonts, templates' },
      { name: 'Website', description: 'Hosting, backups, content' },
      { name: 'Social Media', description: 'Assets, campaigns, schedules' },
      { name: 'Press & PR', description: 'Announcements, launch campaigns' }
    ]
  },
  {
    title: 'Knowledge & Research',
    categories: [
      { name: 'Learning Resources', description: 'Courses, tutorials, references' },
      { name: 'Competitor Research', description: 'Comparisons, screenshots, features' },
      { name: 'Ideas & Notes', description: 'Brainstorms, future app ideas' }
    ]
  }
];

const onboardingChecklist = [
  { key: 'orientation', label: 'Orientation / welcome' },
  { key: 'paperwork', label: 'Contracts & paperwork' },
  { key: 'systems', label: 'System access provisioned' },
  { key: 'training', label: 'Initial training complete' },
  { key: 'probation', label: 'Probation review' }
];

const PeopleWorkspace = () => {
  const { currentCompanyId, userRole } = useCompany();
  const [members, setMembers] = useState([]);
  const [profilesCache, setProfilesCache] = useState({});
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [viewMode, setViewMode] = useState('profile'); // 'profile' | 'workspace'
  const [form, setForm] = useState(defaultProfile);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const canEdit = userRole === 'owner' || userRole === 'manager';

  useEffect(() => {
    if (!currentCompanyId) return;

    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const [memberList, profileList] = await Promise.all([
          getCompanyMembers(currentCompanyId),
          getPeopleProfiles(currentCompanyId)
        ]);

        const sortedMembers = memberList.sort((a, b) =>
          (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')
        );
        setMembers(sortedMembers);

        const cache = profileList.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
        setProfilesCache(cache);

        if (sortedMembers.length > 0 && !selectedMemberId) {
          setSelectedMemberId(sortedMembers[0].userId);
        }
      } catch (error) {
        console.error('Failed to load people workspace data:', error);
        setErrorMessage(error.message || 'Unable to load team data.');
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, [currentCompanyId]);

  useEffect(() => {
    if (!currentCompanyId || !selectedMemberId) return;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setErrorMessage('');
      try {
        const cached = profilesCache[selectedMemberId];
        if (cached) {
          setForm({
            ...defaultProfile,
            ...cached
          });
        } else {
          const profile = await getPeopleProfile(currentCompanyId, selectedMemberId);
          if (profile) {
            setProfilesCache((prev) => ({
              ...prev,
              [selectedMemberId]: profile
            }));
            setForm({
              ...defaultProfile,
              ...profile
            });
          } else {
            const member = members.find((m) => m.userId === selectedMemberId);
            setForm({
              ...defaultProfile,
              fullName: member?.displayName || '',
              preferredName: member?.displayName || '',
              email: member?.email || '',
              role: member?.role || ''
            });
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        setErrorMessage(error.message || 'Unable to load profile details.');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [currentCompanyId, selectedMemberId, profilesCache, members]);

  const selectedMember = useMemo(
    () => {
      const member = members.find((member) => member.userId === selectedMemberId);
      if (member) {
        console.log('[PeopleWorkspace] Selected member:', member.displayName || member.email, 'ViewMode:', viewMode);
      }
      return member;
    },
    [members, selectedMemberId, viewMode]
  );

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleOnboardingToggle = (key) => {
    setForm((prev) => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        [key]: !prev.onboarding?.[key]
      }
    }));
  };

  const handleSaveProfile = async () => {
    if (!currentCompanyId || !selectedMemberId) return;
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await savePeopleProfile(currentCompanyId, selectedMemberId, {
        ...form,
        lastUpdatedBy: selectedMemberId,
        lastUpdatedAt: new Date().toISOString()
      });
      setSuccessMessage('Profile updated successfully.');
      setProfilesCache((prev) => ({
        ...prev,
        [selectedMemberId]: { ...form }
      }));
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrorMessage(error.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (event) => {
    if (!currentCompanyId || !selectedMemberId) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setErrorMessage('');

    try {
      const metadata = await uploadPeopleAttachment(
        currentCompanyId,
        selectedMemberId,
        file,
        (progress) => setUploadProgress(progress)
      );
      const attachments = [...(form.attachments || []), metadata];

      await savePeopleProfile(currentCompanyId, selectedMemberId, {
        attachments
      });

      setForm((prev) => ({
        ...prev,
        attachments
      }));
      setProfilesCache((prev) => ({
        ...prev,
        [selectedMemberId]: {
          ...(prev[selectedMemberId] || {}),
          attachments
        }
      }));
      setSuccessMessage('File uploaded.');
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      setErrorMessage(error.message || 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = async (attachment) => {
    if (!currentCompanyId || !selectedMemberId) return;
    try {
      const updated = await removePeopleAttachment(
        currentCompanyId,
        selectedMemberId,
        attachment,
        form.attachments || []
      );
      setForm((prev) => ({
        ...prev,
        attachments: updated
      }));
      setProfilesCache((prev) => ({
        ...prev,
        [selectedMemberId]: {
          ...(prev[selectedMemberId] || {}),
          attachments: updated
        }
      }));
    } catch (error) {
      console.error('Failed to remove attachment:', error);
      setErrorMessage(error.message || 'Unable to remove attachment.');
    }
  };

  if (!currentCompanyId) {
    return (
      <div className="text-sm text-gray-500">
        Select a company to manage HR workspaces.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold" style={{ backgroundColor: '#005C70' }}>
                HR
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">People Workspace</h2>
                <p className="text-xs text-gray-500">
                  Track onboarding, responsibilities, and documents.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              Team members
            </p>
            {loadingMembers ? (
              <div className="py-6 text-sm text-gray-500 text-center">Loading team…</div>
            ) : members.length === 0 ? (
              <div className="py-6 text-sm text-gray-500 text-center">
                Invite teammates to start their workspace journey.
              </div>
            ) : (
              <ul className="space-y-2">
                {members.map((member) => {
                  const isActive = selectedMemberId === member.userId;
                  return (
                    <li key={member.userId}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(member.userId);
                          setViewMode('profile'); // Reset to profile view when selecting new member
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                          isActive
                            ? 'border-[#005C70] bg-[#F0FBF8] text-gray-900'
                            : 'border-gray-200 hover:border-[#005C70]/50 hover:bg-[#F0FBF8]/50 text-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {member.displayName || member.email}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{member.role || 'employee'}</p>
                          </div>
                          {isActive && (
                            <div className="flex items-center gap-1">
                              <FaTasks className="w-3 h-3 text-[#005C70]" />
                              <FaBullseye className="w-3 h-3 text-[#005C70]" />
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-5 pb-5">
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-xs text-gray-500 flex items-start gap-3">
              <FaShieldAlt className="w-4 h-4 text-[#005C70]" />
              <p>
                Access is limited to owners and managers. Documents are stored securely in Firebase Storage.
              </p>
            </div>
          </div>
        </aside>

        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          {selectedMember ? (
            <>
              <header className="flex flex-col gap-1 border-b border-gray-200 pb-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedMember.displayName || selectedMember.email}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#00BFA6', color: '#074147' }}>
                      {selectedMember.role || 'employee'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('profile')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        viewMode === 'profile'
                          ? 'bg-[#005C70] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <FaUser className="w-4 h-4 inline mr-2" />
                      Profile
                    </button>
                    <button
                      onClick={() => setViewMode('workspace')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        viewMode === 'workspace'
                          ? 'bg-[#005C70] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <FaTasks className="w-4 h-4 inline mr-2" />
                      Workspace
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{selectedMember.email}</p>
              </header>

              {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {successMessage}
                </div>
              )}

              {viewMode === 'workspace' ? (
                <PersonWorkspace
                  member={selectedMember}
                  canEdit={canEdit}
                  profileData={form}
                />
              ) : loadingProfile ? (
                <div className="py-12 text-center text-gray-500">Loading profile…</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Role / Job title
                      </label>
                      <input
                        type="text"
                        value={form.role}
                        onChange={(event) => handleFieldChange('role', event.target.value)}
                        disabled={!canEdit}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#00BFA6]/40 focus:outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Employment type
                      </label>
                      <select
                        value={form.employmentType}
                        onChange={(event) => handleFieldChange('employmentType', event.target.value)}
                        disabled={!canEdit}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#00BFA6]/40 focus:outline-none disabled:bg-gray-100"
                      >
                        <option>Full-time</option>
                        <option>Part-time</option>
                        <option>Contractor</option>
                        <option>Consultant</option>
                        <option>Intern</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={form.department}
                        onChange={(event) => handleFieldChange('department', event.target.value)}
                        disabled={!canEdit}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#00BFA6]/40 focus:outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Manager / Reports to
                      </label>
                      <input
                        type="text"
                        value={form.manager}
                        onChange={(event) => handleFieldChange('manager', event.target.value)}
                        disabled={!canEdit}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#00BFA6]/40 focus:outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Start date
                      </label>
                      <input
                        type="date"
                        value={form.startDate ? form.startDate.slice(0, 10) : ''}
                        onChange={(event) => handleFieldChange('startDate', event.target.value)}
                        disabled={!canEdit}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#00BFA6]/40 focus:outline-none disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Responsibilities & scope
                    </label>
                    <textarea
                      rows={4}
                      value={form.responsibilities}
                      onChange={(event) => handleFieldChange('responsibilities', event.target.value)}
                      disabled={!canEdit}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#00BFA6]/40 focus:outline-none disabled:bg-gray-100"
                      placeholder="Outline key duties, deliverables, and success metrics for this role."
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FaClipboardList className="w-4 h-4 text-[#005C70]" />
                      <h4 className="text-sm font-semibold text-gray-800">Onboarding checklist</h4>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {onboardingChecklist.map((item) => (
                        <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={form.onboarding?.[item.key] || false}
                            onChange={() => handleOnboardingToggle(item.key)}
                            disabled={!canEdit}
                            className="rounded border-gray-300 text-[#00BFA6] focus:ring-[#00BFA6]"
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Notes & review
                    </label>
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(event) => handleFieldChange('notes', event.target.value)}
                      disabled={!canEdit}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#00BFA6]/40 focus:outline-none disabled:bg-gray-100"
                      placeholder="Document feedback, goals, or conversations relevant to this teammate."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Attachments
                      </label>
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-white cursor-pointer" style={{ backgroundColor: '#005C70' }}>
                        <FaFileUpload className="w-3.5 h-3.5" />
                        Upload file
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleUpload}
                          disabled={!canEdit || uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {uploading && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-500 mb-1">Uploading… {Math.round(uploadProgress)}%</div>
                        <div className="w-full bg-gray-200 h-2 rounded">
                          <div
                            className="h-2 rounded"
                            style={{
                              width: `${uploadProgress}%`,
                              backgroundColor: '#00BFA6'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {(form.attachments || []).length === 0 ? (
                        <div className="py-6 text-sm text-gray-500 text-center">
                          No attachments yet. Upload CVs, interview notes, or signed documents.
                        </div>
                      ) : (
                        form.attachments.map((attachment) => (
                          <div key={attachment.filePath} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{attachment.fileName}</p>
                              <p className="text-xs text-gray-500">
                                Uploaded {new Date(attachment.uploadedAt).toLocaleString()}
                              </p>
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(attachment)}
                                className="text-xs font-medium text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FaCheckCircle className="w-3.5 h-3.5 text-[#00BFA6]" />
                        Updates are saved to your Firebase workspace and tracked in the owner timeline.
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition"
                          style={{ backgroundColor: '#005C70' }}
                        >
                          {saving ? 'Saving…' : 'Save profile'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-gray-500">
              Select a team member to load their workspace.
            </div>
          )}
        </section>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <header className="flex items-center gap-3 border-b border-gray-200 pb-4 mb-4">
          <FaFolderOpen className="w-5 h-5 text-[#005C70]" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Biz-CoPilot Company OS</h3>
            <p className="text-sm text-gray-500">
              Organize knowledge, files, and workflows inside structured folders aligned with your operating system.
            </p>
          </div>
        </header>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workspaceSections.map((section) => (
            <div key={section.title} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.categories.map((category) => (
                  <li key={category.name} className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">{category.name}</span> — {category.description}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PeopleWorkspace;

