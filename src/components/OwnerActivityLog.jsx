import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db, getUserProfile } from '../firebase';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { AUDIT_CATEGORIES } from '../utils/auditLog';
import { FaArrowLeft, FaShieldAlt, FaSearch, FaStream } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const statusStyles = {
  success: 'border-green-200 bg-green-50 text-green-700',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  failure: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700'
};

const OwnerActivityLog = () => {
  const navigate = useNavigate();
  const { currentCompanyId, currentCompany, userRole } = useCompany();
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userCache, setUserCache] = useState({});

  // Subscribe to audit logs
  useEffect(() => {
    if (!currentCompanyId || userRole !== 'owner') {
      setLoading(false);
      return;
    }

    const logsRef = collection(db, `companies/${currentCompanyId}/auditLogs`);
    const logsQuery = query(logsRef, orderBy('timestamp', 'desc'), limit(200));

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(entries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentCompanyId, userRole]);

  // Hydrate user profiles for timeline
  useEffect(() => {
    if (!logs.length) return;

    const uniqueUserIds = new Set(
      logs
        .map((log) => log.userId)
        .filter(Boolean)
    );

    const missingIds = Array.from(uniqueUserIds).filter((id) => !userCache[id]);
    if (!missingIds.length) return;

    const fetchProfiles = async () => {
      const results = await Promise.all(
        missingIds.map(async (userId) => {
          try {
            const profile = await getUserProfile(userId);
            return [userId, profile];
          } catch (error) {
            console.warn('Failed to load profile for audit log', userId, error);
            return [userId, null];
          }
        })
      );

      const profileMap = results.reduce((acc, [id, profile]) => {
        acc[id] = profile;
        return acc;
      }, {});

      setUserCache((prev) => ({ ...prev, ...profileMap }));
    };

    fetchProfiles();
  }, [logs, userCache]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchCategory = selectedCategory === 'all' || log.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || log.status === selectedStatus;

      let matchSearch = true;
      if (searchTerm) {
        const haystack = JSON.stringify(log.details || {})
          .concat(log.eventType || '')
          .concat(userCache[log.userId]?.displayName || '')
          .concat(log.details?.email || '');
        matchSearch = haystack.toLowerCase().includes(searchTerm.toLowerCase());
      }

      return matchCategory && matchStatus && matchSearch;
    });
  }, [logs, selectedCategory, selectedStatus, searchTerm, userCache]);

  const logsByDay = useMemo(() => {
    return filteredLogs.reduce((acc, log) => {
      const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
      const key = date.toLocaleDateString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
      return acc;
    }, {});
  }, [filteredLogs]);

  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...Object.values(AUDIT_CATEGORIES).map((category) => ({
      value: category,
      label: category.charAt(0).toUpperCase() + category.slice(1)
    }))
  ];

  if (!currentCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
          <FaShieldAlt className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Select a company</h1>
          <p className="text-sm text-gray-500">Choose a workspace to view the owner activity timeline.</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'owner') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
          <FaShieldAlt className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Restricted area</h1>
          <p className="text-sm text-gray-500">Only company owners can view the full activity timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[#005C70]">Owner Control</p>
              <h1 className="text-2xl font-bold text-gray-900">Activity Timeline</h1>
              <p className="text-sm text-gray-500">
                Full audit history for {currentCompany?.name || 'your company'}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Signed in as <span className="font-medium text-gray-700">{currentUser?.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Filter by category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2FGF3F]/40 focus:outline-none text-sm"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2FGF3F]/40 focus:outline-none text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="failure">Failure</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Search logs
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by person, email, event, or detail"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2FGF3F]/40 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-lg px-4 py-2">
              <FaStream className="w-4 h-4 text-[#2FGF3F]" />
              <span>
                Showing <span className="font-semibold text-gray-700">{filteredLogs.length}</span> of{' '}
                <span className="font-semibold text-gray-700">{logs.length}</span> recent events
              </span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 border-b-2 border-[#2FGF3F] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading audit history…</p>
            </div>
          </div>
        ) : (
          <section className="space-y-6">
            {Object.keys(logsByDay).length === 0 && (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center text-gray-500">
                No activity found for the selected filters.
              </div>
            )}

            {Object.entries(logsByDay).map(([day, dayLogs]) => (
              <div key={day} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-gray-100 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-700">{day}</h2>
                </div>
                <ul className="divide-y divide-gray-100">
                  {dayLogs.map((log) => {
                    const profile = userCache[log.userId];
                    const statusClass = statusStyles[log.status] || statusStyles.info;
                    const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();

                    return (
                      <li key={log.id} className="px-6 py-4 flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-400 uppercase tracking-wide">
                            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {formatDistanceToNow(timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <div className={`flex-1 border rounded-lg px-4 py-3 ${statusClass}`}>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wide">
                              {log.eventType}
                            </span>
                            <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 bg-white/70 rounded-full">
                              {log.category}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              {profile?.photoURL ? (
                                <img
                                  src={profile.photoURL}
                                  alt={profile.displayName || log.details?.email || 'User'}
                                  className="w-8 h-8 rounded-full object-cover border border-white/80 shadow-sm"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/70 text-[#2FGF3F] flex items-center justify-center font-semibold">
                                  {(profile?.displayName || log.details?.email || 'U')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-medium leading-tight">
                                  {profile?.displayName || log.details?.email || 'System'}
                                </p>
                                {profile?.jobTitle && (
                                  <p className="text-xs text-gray-500">{profile.jobTitle}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 text-sm text-gray-700">
                              {log.details && Object.keys(log.details).length > 0 ? (
                                <pre className="bg-white/70 text-xs text-gray-700 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : (
                                <span className="text-xs text-gray-500">No additional details</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default OwnerActivityLog;

