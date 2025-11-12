import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto
} from '../firebase';

const timezoneOptions = (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function')
  ? Intl.supportedValuesOf('timeZone')
  : [Intl.DateTimeFormat().resolvedOptions().timeZone];

const defaultProfile = {
  firstName: '',
  lastName: '',
  displayName: '',
  fullName: '',
  jobTitle: '',
  phone: '',
  timezone: '',
  location: '',
  bio: '',
  pronouns: '',
  photoURL: '',
  photoStoragePath: ''
};

const fieldLabel = {
  firstName: 'First name',
  lastName: 'Last name',
  displayName: 'Display name',
  jobTitle: 'Role / Job title',
  phone: 'Phone number',
  timezone: 'Timezone',
  location: 'Location',
  bio: 'Bio / About',
  pronouns: 'Pronouns'
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(defaultProfile);
  const [initialProfile, setInitialProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const displayName = useMemo(() => {
    if (profile.displayName) {
      return profile.displayName;
    }
    const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    if (name) return name;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return '';
  }, [profile.firstName, profile.lastName, profile.displayName, currentUser]);

  const hasChanges = useMemo(() => JSON.stringify(profile) !== JSON.stringify(initialProfile), [profile, initialProfile]);

  const timezoneList = useMemo(() => {
    if (!profile.timezone) return timezoneOptions;
    if (timezoneOptions.includes(profile.timezone)) return timezoneOptions;
    return [profile.timezone, ...timezoneOptions];
  }, [profile.timezone]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError('');
      try {
        const storedProfile = await getUserProfile(currentUser.uid);
        const hydrated = {
          ...defaultProfile,
          email: currentUser.email,
          firstName: storedProfile?.firstName || '',
          lastName: storedProfile?.lastName || '',
          displayName: storedProfile?.displayName || currentUser.displayName || '',
          jobTitle: storedProfile?.jobTitle || '',
          phone: storedProfile?.phone || '',
          timezone: storedProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: storedProfile?.location || '',
          bio: storedProfile?.bio || '',
          pronouns: storedProfile?.pronouns || '',
          fullName: storedProfile?.fullName || storedProfile?.displayName || currentUser.displayName || '',
          photoURL: storedProfile?.photoURL || currentUser.photoURL || '',
          photoStoragePath: storedProfile?.photoStoragePath || ''
        };
        setProfile(hydrated);
        setInitialProfile(hydrated);
      } catch (loadError) {
        console.error('Failed to load profile:', loadError);
        setError(loadError.message || 'Unable to load profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser]);

  const handleFieldChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value
    }));
    setSuccess('');
    setError('');
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingPhoto(true);
    setError('');
    setSuccess('');

    try {
      const { photoURL, photoStoragePath } = await uploadProfilePhoto(currentUser.uid, file, profile.photoStoragePath);
      setProfile((prev) => ({
        ...prev,
        photoURL,
        photoStoragePath
      }));
    } catch (uploadError) {
      console.error('Profile photo upload failed:', uploadError);
      setError(uploadError.message || 'Failed to upload profile photo. Please try a different image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setProfile((prev) => ({
      ...prev,
      photoURL: '',
      photoStoragePath: ''
    }));
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        displayName: displayName,
        fullName: displayName,
        jobTitle: profile.jobTitle.trim(),
        phone: profile.phone.trim(),
        timezone: profile.timezone,
        location: profile.location.trim(),
        bio: profile.bio.trim(),
        pronouns: profile.pronouns.trim(),
        photoURL: profile.photoURL,
        photoStoragePath: profile.photoStoragePath,
        updatedBy: currentUser.uid
      };

      await updateUserProfile(currentUser.uid, payload);

      setProfile((prev) => ({
        ...prev,
        ...payload
      }));

      setInitialProfile((prev) => ({
        ...prev,
        ...payload
      }));

      setSuccess('Profile saved successfully.');
    } catch (saveError) {
      console.error('Failed to save profile:', saveError);
      setError(saveError.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">No user session</h1>
          <p className="text-sm text-gray-500 mb-6">Please sign in again to access your profile.</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Account</p>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500">Manage your identity, contact details, and workspace presence.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Back
            </button>
            <button
              type="submit"
              form="profile-form"
              disabled={!hasChanges || saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-[280px,1fr] gap-6">
          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Profile photo</h2>
            <p className="text-xs text-gray-500 mt-1 mb-4">Shown across the workspace and audit trail.</p>

            <div className="flex flex-col items-center gap-4">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={displayName || currentUser.email}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#005C70] to-[#2F6F63] flex items-center justify-center text-2xl font-semibold text-white shadow">
                  {(displayName || currentUser.email)?.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col items-center gap-2">
                <label className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer">
                  {uploadingPhoto ? 'Uploading…' : 'Upload new photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
                {profile.photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Remove photo
                  </button>
                )}
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  Recommended: square image, 400×400px minimum. PNG or JPG up to 2 MB.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <form id="profile-form" onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Identity</h2>
                <p className="text-xs text-gray-500 mt-1">How teammates see you across Biz-CoPilot.</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {['firstName', 'lastName', 'pronouns', 'jobTitle'].map((field) => (
                    <div key={field} className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {fieldLabel[field]}
                      </label>
                      <input
                        type="text"
                        value={profile[field]}
                        onChange={(event) => handleFieldChange(field, event.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder={fieldLabel[field]}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Preferred display name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(event) => handleFieldChange('displayName', event.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Preferred display name"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Bio / About</label>
                    <textarea
                      value={profile.bio}
                      onChange={(event) => handleFieldChange('bio', event.target.value)}
                      rows={4}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y"
                      placeholder="Share a short intro, expertise, or how you prefer to work"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact & regional</h2>
                <p className="text-xs text-gray-500 mt-1">Used for communication and scheduling.</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
                    <input
                      type="text"
                      value={currentUser.email}
                      disabled
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Phone number</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(event) => handleFieldChange('phone', event.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="+31 6 1234 5678"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Timezone</label>
                    <select
                      value={profile.timezone}
                      onChange={(event) => handleFieldChange('timezone', event.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      {timezoneList.map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Location</label>
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(event) => handleFieldChange('location', event.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Amsterdam, NL"
                    />
                  </div>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
