/**
 * MARKETING TRACKER MODULE
 * 
 * Comprehensive marketing management system:
 * - Campaign creation, design, and tracking
 * - Social media account management
 * - Content calendar and scheduling
 * - Task management and collaboration
 * - Analytics and reporting
 * - Asset management
 * - Lead generation tracking
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlusCircle,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTimes,
  FaBullhorn,
  FaSave,
  FaCalendar,
  FaUsers,
  FaChartLine,
  FaImage,
  FaVideo,
  FaFileAlt,
  FaLink,
  FaHashtag,
  FaShareAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaSearch,
  FaTag,
  FaDollarSign,
  FaEye,
  FaThumbsUp,
  FaComment,
  FaShare,
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaYoutube,
  FaTiktok,
  FaPinterest,
  FaTasks,
  FaUserPlus,
  FaRocket,
  FaChartBar,
  FaDownload,
  FaUpload,
  FaFolder,
  FaComments,
  FaBell
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import CompanySelector from './CompanySelector';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyCampaigns,
  addCompanyCampaign,
  updateCompanyCampaign,
  deleteCompanyCampaign,
  getCompanySocialAccounts,
  addCompanySocialAccount,
  updateCompanySocialAccount,
  deleteCompanySocialAccount,
  getCompanyMarketingTasks,
  addCompanyMarketingTask,
  updateCompanyMarketingTask,
  deleteCompanyMarketingTask,
  getCompanyMarketingAssets,
  addCompanyMarketingAsset,
  deleteCompanyMarketingAsset,
  getCompanyLeads,
  addCompanyLead,
  updateCompanyLead,
  deleteCompanyLead,
  getCompanyMembers
} from '../firebase';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';

const MarketingTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const headerLogo = useMemo(() => getHeaderLogo(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);

  // State Management
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns', 'social', 'tasks', 'analytics', 'assets', 'leads'
  const [campaigns, setCampaigns] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [leads, setLeads] = useState([]);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    assignedTo: 'all',
    periodType: 'all',
    startDate: '',
    endDate: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    // Campaign fields
    name: '',
    description: '',
    type: 'social', // 'social', 'email', 'content', 'paid', 'event', 'other'
    status: 'draft', // 'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'
    startDate: '',
    endDate: '',
    budget: 0,
    targetAudience: '',
    goals: [],
    channels: [], // ['facebook', 'instagram', 'twitter', 'linkedin', 'email', etc.]
    tags: [],
    assignedTo: '',
    // Social account fields
    platform: 'facebook', // 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest'
    accountName: '',
    accountUrl: '',
    accessToken: '',
    isActive: true,
    // Task fields
    title: '',
    taskDescription: '',
    priority: 'medium', // 'low', 'medium', 'high', 'urgent'
    dueDate: '',
    taskStatus: 'todo', // 'todo', 'in-progress', 'review', 'done', 'blocked'
    taskAssignee: '',
    // Asset fields
    assetName: '',
    assetType: 'image', // 'image', 'video', 'document', 'template', 'other'
    assetUrl: '',
    // Lead fields
    leadName: '',
    leadEmail: '',
    leadPhone: '',
    leadSource: '',
    leadStatus: 'new', // 'new', 'contacted', 'qualified', 'converted', 'lost'
    notes: ''
  });

  // Load data
  useEffect(() => {
    if (!currentCompanyId) return;
    loadAllData();
  }, [currentCompanyId]);

  const loadAllData = async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    try {
      const [campaignsData, socialData, tasksData, assetsData, leadsData, membersData] = await Promise.all([
        getCompanyCampaigns(currentCompanyId),
        getCompanySocialAccounts(currentCompanyId),
        getCompanyMarketingTasks(currentCompanyId),
        getCompanyMarketingAssets(currentCompanyId),
        getCompanyLeads(currentCompanyId),
        getCompanyMembers(currentCompanyId)
      ]);
      
      setCampaigns(campaignsData || []);
      setSocialAccounts(socialData || []);
      setTasks(tasksData || []);
      setAssets(assetsData || []);
      setLeads(leadsData || []);
      setCompanyMembers(membersData || []);
    } catch (error) {
      console.error('Error loading marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalBudget = campaigns.reduce((sum, c) => sum + (parseFloat(c.budget) || 0), 0);
    const activeTasks = tasks.filter(t => t.taskStatus !== 'done').length;
    const newLeads = leads.filter(l => l.leadStatus === 'new').length;
    
    return {
      activeCampaigns,
      totalBudget,
      activeTasks,
      newLeads,
      connectedAccounts: socialAccounts.filter(a => a.isActive).length
    };
  }, [campaigns, tasks, leads, socialAccounts]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentCompanyId || !currentUser) return;

    try {
      if (activeTab === 'campaigns') {
        if (editingItem) {
          await updateCompanyCampaign(currentCompanyId, editingItem.id, formData);
        } else {
          await addCompanyCampaign(currentCompanyId, currentUser.uid, formData);
        }
      } else if (activeTab === 'social') {
        if (editingItem) {
          await updateCompanySocialAccount(currentCompanyId, editingItem.id, formData);
        } else {
          await addCompanySocialAccount(currentCompanyId, currentUser.uid, formData);
        }
      } else if (activeTab === 'tasks') {
        if (editingItem) {
          await updateCompanyMarketingTask(currentCompanyId, editingItem.id, formData);
        } else {
          await addCompanyMarketingTask(currentCompanyId, currentUser.uid, formData);
        }
      } else if (activeTab === 'assets') {
        if (editingItem) {
          // Update not implemented yet
          alert('Asset updates coming soon');
        } else {
          await addCompanyMarketingAsset(currentCompanyId, currentUser.uid, formData);
        }
      } else if (activeTab === 'leads') {
        if (editingItem) {
          await updateCompanyLead(currentCompanyId, editingItem.id, formData);
        } else {
          await addCompanyLead(currentCompanyId, currentUser.uid, formData);
        }
      }
      
      await loadAllData();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving. Please try again.');
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm(`Are you sure you want to delete this ${activeTab === 'campaigns' ? 'campaign' : activeTab === 'social' ? 'account' : activeTab === 'tasks' ? 'task' : activeTab === 'assets' ? 'asset' : 'lead'}?`)) return;
    if (!currentCompanyId) return;

    try {
      if (activeTab === 'campaigns') {
        await deleteCompanyCampaign(currentCompanyId, itemId);
      } else if (activeTab === 'social') {
        await deleteCompanySocialAccount(currentCompanyId, itemId);
      } else if (activeTab === 'tasks') {
        await deleteCompanyMarketingTask(currentCompanyId, itemId);
      } else if (activeTab === 'assets') {
        await deleteCompanyMarketingAsset(currentCompanyId, itemId);
      } else if (activeTab === 'leads') {
        await deleteCompanyLead(currentCompanyId, itemId);
      }
      await loadAllData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'social',
      status: 'draft',
      startDate: '',
      endDate: '',
      budget: 0,
      targetAudience: '',
      goals: [],
      channels: [],
      tags: [],
      assignedTo: '',
      platform: 'facebook',
      accountName: '',
      accountUrl: '',
      accessToken: '',
      isActive: true,
      followers: 0,
      title: '',
      taskDescription: '',
      priority: 'medium',
      dueDate: '',
      taskStatus: 'todo',
      taskAssignee: '',
      assetName: '',
      assetType: 'image',
      assetUrl: '',
      leadName: '',
      leadEmail: '',
      leadPhone: '',
      leadSource: '',
      leadStatus: 'new',
      notes: ''
    });
    setEditingItem(null);
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      facebook: FaFacebook,
      instagram: FaInstagram,
      twitter: FaTwitter,
      linkedin: FaLinkedin,
      youtube: FaYoutube,
      tiktok: FaTiktok,
      pinterest: FaPinterest
    };
    return icons[platform] || FaShareAlt;
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'gray',
      scheduled: 'blue',
      active: 'green',
      paused: 'yellow',
      completed: 'green',
      cancelled: 'red',
      todo: 'gray',
      'in-progress': 'blue',
      review: 'yellow',
      done: 'green',
      blocked: 'red',
      new: 'blue',
      contacted: 'yellow',
      qualified: 'green',
      converted: 'green',
      lost: 'red'
    };
    return colors[status] || 'gray';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading marketing dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.activeCampaigns}</p>
              </div>
              <FaRocket className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">€{metrics.totalBudget.toFixed(2)}</p>
              </div>
              <FaDollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.activeTasks}</p>
              </div>
              <FaTasks className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Leads</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.newLeads}</p>
              </div>
              <FaUserPlus className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connected Accounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.connectedAccounts}</p>
              </div>
              <FaShareAlt className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'campaigns', label: 'Campaigns', icon: FaRocket },
                { id: 'social', label: 'Social Accounts', icon: FaShareAlt },
                { id: 'tasks', label: 'Tasks', icon: FaTasks },
                { id: 'analytics', label: 'Analytics', icon: FaChartBar },
                { id: 'assets', label: 'Assets', icon: FaFolder },
                { id: 'leads', label: 'Leads', icon: FaUserPlus }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'campaigns' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Marketing Campaigns</h2>
                <div className="flex items-center space-x-3">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    onClick={() => {
                      resetForm();
                      setFormData(prev => ({ ...prev, type: 'social', status: 'draft' }));
                      setShowAddModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <FaPlusCircle className="mr-2" />
                    New Campaign
                  </button>
                </div>
              </div>
              
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <FaRocket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No campaigns yet</p>
                  <p className="text-sm text-gray-500">Create your first marketing campaign to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns
                    .filter(c => filters.status === 'all' || c.status === filters.status)
                    .map(campaign => {
                      const startDate = campaign.startDate?.toDate?.() || (campaign.startDate ? new Date(campaign.startDate) : null);
                      const endDate = campaign.endDate?.toDate?.() || (campaign.endDate ? new Date(campaign.endDate) : null);
                      
                      return (
                        <div
                          key={campaign.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setViewingItem(campaign);
                            setShowDetailDrawer(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                                  campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {campaign.status}
                                </span>
                                <span className="text-sm text-gray-500">{campaign.type}</span>
                              </div>
                              {campaign.description && (
                                <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                {startDate && <span>📅 Start: {startDate.toLocaleDateString()}</span>}
                                {endDate && <span>📅 End: {endDate.toLocaleDateString()}</span>}
                                {campaign.budget > 0 && <span>💰 Budget: €{campaign.budget.toFixed(2)}</span>}
                                {campaign.channels?.length > 0 && (
                                  <span>📱 {campaign.channels.length} channel{campaign.channels.length > 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const campaignData = campaign;
                                  setFormData({
                                    name: campaignData.name || '',
                                    description: campaignData.description || '',
                                    type: campaignData.type || 'social',
                                    status: campaignData.status || 'draft',
                                    startDate: startDate ? startDate.toISOString().split('T')[0] : '',
                                    endDate: endDate ? endDate.toISOString().split('T')[0] : '',
                                    budget: campaignData.budget || 0,
                                    targetAudience: campaignData.targetAudience || '',
                                    goals: campaignData.goals || [],
                                    channels: campaignData.channels || [],
                                    tags: campaignData.tags || [],
                                    assignedTo: campaignData.assignedTo || '',
                                    notes: campaignData.notes || ''
                                  });
                                  setEditingItem(campaign);
                                  setShowAddModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-orange-600"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(campaign.id);
                                }}
                                className="p-2 text-gray-600 hover:text-red-600"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'social' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Social Media Accounts</h2>
                <button
                  onClick={() => {
                    resetForm();
                    setFormData(prev => ({ ...prev, platform: 'facebook', isActive: true }));
                    setShowAddModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <FaPlusCircle className="mr-2" />
                  Connect Account
                </button>
              </div>
              
              {socialAccounts.length === 0 ? (
                <div className="text-center py-12">
                  <FaShareAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No social accounts connected</p>
                  <p className="text-sm text-gray-500">Connect your social media accounts to manage campaigns</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {socialAccounts.map(account => {
                    const PlatformIcon = getPlatformIcon(account.platform);
                    return (
                      <div
                        key={account.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              account.platform === 'facebook' ? 'bg-blue-100 text-blue-600' :
                              account.platform === 'instagram' ? 'bg-pink-100 text-pink-600' :
                              account.platform === 'twitter' ? 'bg-sky-100 text-sky-600' :
                              account.platform === 'linkedin' ? 'bg-blue-100 text-blue-700' :
                              account.platform === 'youtube' ? 'bg-red-100 text-red-600' :
                              account.platform === 'tiktok' ? 'bg-black text-white' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              <PlatformIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 capitalize">{account.platform}</h3>
                              <p className="text-sm text-gray-600">{account.accountName || 'Unnamed Account'}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {account.accountUrl && (
                          <a
                            href={account.accountUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline mb-2 block"
                          >
                            {account.accountUrl}
                          </a>
                        )}
                        {account.followers > 0 && (
                          <p className="text-sm text-gray-500 mb-3">👥 {account.followers.toLocaleString()} followers</p>
                        )}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setFormData({
                                platform: account.platform || 'facebook',
                                accountName: account.accountName || '',
                                accountUrl: account.accountUrl || '',
                                accessToken: account.accessToken || '',
                                isActive: account.isActive !== false,
                                followers: account.followers || 0,
                                notes: account.notes || ''
                              });
                              setEditingItem(account);
                              setShowAddModal(true);
                            }}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            <FaEdit className="inline mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Marketing Tasks</h2>
                <div className="flex items-center space-x-3">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <button
                    onClick={() => {
                      resetForm();
                      setFormData(prev => ({ ...prev, priority: 'medium', taskStatus: 'todo' }));
                      setShowAddModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <FaPlusCircle className="mr-2" />
                    New Task
                  </button>
                </div>
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <FaTasks className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No tasks yet</p>
                  <p className="text-sm text-gray-500">Create tasks to track marketing work and collaboration</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks
                    .filter(t => filters.status === 'all' || t.taskStatus === filters.status)
                    .map(task => {
                      const dueDate = task.dueDate?.toDate?.() || (task.dueDate ? new Date(task.dueDate) : null);
                      const assignee = companyMembers.find(m => m.userId === task.taskAssignee);
                      const priorityColors = {
                        low: 'bg-gray-100 text-gray-800',
                        medium: 'bg-blue-100 text-blue-800',
                        high: 'bg-orange-100 text-orange-800',
                        urgent: 'bg-red-100 text-red-800'
                      };
                      
                      return (
                        <div
                          key={task.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority] || priorityColors.medium}`}>
                                  {task.priority}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  task.taskStatus === 'done' ? 'bg-green-100 text-green-800' :
                                  task.taskStatus === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                  task.taskStatus === 'review' ? 'bg-yellow-100 text-yellow-800' :
                                  task.taskStatus === 'blocked' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {task.taskStatus}
                                </span>
                              </div>
                              {task.taskDescription && (
                                <p className="text-sm text-gray-600 mb-2">{task.taskDescription}</p>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                {dueDate && (
                                  <span className={dueDate < new Date() && task.taskStatus !== 'done' ? 'text-red-600 font-medium' : ''}>
                                    📅 Due: {dueDate.toLocaleDateString()}
                                  </span>
                                )}
                                {assignee && (
                                  <span>👤 {assignee.email || assignee.displayName || 'Unassigned'}</span>
                                )}
                                {task.comments?.length > 0 && (
                                  <span>💬 {task.comments.length} comment{task.comments.length > 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => {
                                  setFormData({
                                    title: task.title || '',
                                    taskDescription: task.taskDescription || '',
                                    priority: task.priority || 'medium',
                                    dueDate: dueDate ? dueDate.toISOString().split('T')[0] : '',
                                    taskStatus: task.taskStatus || 'todo',
                                    taskAssignee: task.taskAssignee || '',
                                    campaignId: task.campaignId || '',
                                    tags: task.tags || []
                                  });
                                  setEditingItem(task);
                                  setShowAddModal(true);
                                }}
                                className="p-2 text-gray-600 hover:text-orange-600"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="p-2 text-gray-600 hover:text-red-600"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Analytics & Reporting</h2>
              <p className="text-gray-600 mb-4">Analytics dashboard coming soon...</p>
            </div>
          )}

          {activeTab === 'assets' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Marketing Assets</h2>
                <button
                  onClick={() => {
                    resetForm();
                    setFormData(prev => ({ ...prev, assetType: 'image' }));
                    setShowAddModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <FaUpload className="mr-2" />
                  Upload Asset
                </button>
              </div>
              
              {assets.length === 0 ? (
                <div className="text-center py-12">
                  <FaFolder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No assets yet</p>
                  <p className="text-sm text-gray-500">Upload images, videos, and documents for your campaigns</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {assets.map(asset => {
                    const assetIcons = {
                      image: FaImage,
                      video: FaVideo,
                      document: FaFileAlt,
                      template: FaFileAlt,
                      other: FaFileAlt
                    };
                    const AssetIcon = assetIcons[asset.assetType] || FaFileAlt;
                    
                    return (
                      <div
                        key={asset.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-center mb-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            {asset.assetType === 'image' && asset.assetUrl ? (
                              <img src={asset.assetUrl} alt={asset.assetName} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <AssetIcon className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                        </div>
                        <h3 className="font-medium text-gray-900 text-sm mb-1 truncate">{asset.assetName}</h3>
                        <p className="text-xs text-gray-500 capitalize mb-2">{asset.assetType}</p>
                        {asset.fileSize > 0 && (
                          <p className="text-xs text-gray-400 mb-2">
                            {(asset.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="w-full px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          <FaTrash className="inline mr-1" /> Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leads' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Lead Generation</h2>
                <div className="flex items-center space-x-3">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                  <button
                    onClick={() => {
                      resetForm();
                      setFormData(prev => ({ ...prev, leadStatus: 'new' }));
                      setShowAddModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <FaPlusCircle className="mr-2" />
                    Add Lead
                  </button>
                </div>
              </div>
              
              {leads.length === 0 ? (
                <div className="text-center py-12">
                  <FaUserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No leads yet</p>
                  <p className="text-sm text-gray-500">Track potential customers and their journey</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leads
                    .filter(l => filters.status === 'all' || l.leadStatus === filters.status)
                    .map(lead => (
                      <div
                        key={lead.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{lead.leadName || 'Unnamed Lead'}</h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                lead.leadStatus === 'converted' ? 'bg-green-100 text-green-800' :
                                lead.leadStatus === 'qualified' ? 'bg-blue-100 text-blue-800' :
                                lead.leadStatus === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                lead.leadStatus === 'lost' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {lead.leadStatus}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              {lead.leadEmail && <span>📧 {lead.leadEmail}</span>}
                              {lead.leadPhone && <span>📞 {lead.leadPhone}</span>}
                              {lead.leadCompany && <span>🏢 {lead.leadCompany}</span>}
                              {lead.leadSource && <span>📍 Source: {lead.leadSource}</span>}
                            </div>
                            {lead.notes && (
                              <p className="text-sm text-gray-500 mt-2">{lead.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => {
                                setFormData({
                                  leadName: lead.leadName || '',
                                  leadEmail: lead.leadEmail || '',
                                  leadPhone: lead.leadPhone || '',
                                  leadCompany: lead.leadCompany || '',
                                  leadSource: lead.leadSource || '',
                                  leadStatus: lead.leadStatus || 'new',
                                  campaignId: lead.campaignId || '',
                                  notes: lead.notes || '',
                                  tags: lead.tags || []
                                });
                                setEditingItem(lead);
                                setShowAddModal(true);
                              }}
                              className="p-2 text-gray-600 hover:text-orange-600"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(lead.id)}
                              className="p-2 text-gray-600 hover:text-red-600"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit' : 'New'} {activeTab === 'campaigns' ? 'Campaign' : activeTab === 'social' ? 'Social Account' : activeTab === 'tasks' ? 'Task' : activeTab === 'assets' ? 'Asset' : 'Lead'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Campaign Form */}
              {activeTab === 'campaigns' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        required
                      >
                        <option value="social">Social Media</option>
                        <option value="email">Email</option>
                        <option value="content">Content</option>
                        <option value="paid">Paid Advertising</option>
                        <option value="event">Event</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        required
                      >
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Budget (€)</label>
                      <input
                        type="number"
                        name="budget"
                        value={formData.budget}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                      <select
                        name="assignedTo"
                        value={formData.assignedTo}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="">Unassigned</option>
                        {companyMembers.map(member => (
                          <option key={member.userId} value={member.userId}>
                            {member.email || member.displayName || 'Unnamed'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                    <input
                      type="text"
                      name="targetAudience"
                      value={formData.targetAudience}
                      onChange={handleInputChange}
                      placeholder="e.g., Small business owners, 25-45 years old"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
                    <div className="flex flex-wrap gap-2">
                      {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'email'].map(channel => (
                        <label key={channel} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.channels?.includes(channel) || false}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                channels: e.target.checked
                                  ? [...(prev.channels || []), channel]
                                  : (prev.channels || []).filter(c => c !== channel)
                              }));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm capitalize">{channel}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </>
              )}

              {/* Social Account Form */}
              {activeTab === 'social' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform *</label>
                    <select
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="youtube">YouTube</option>
                      <option value="tiktok">TikTok</option>
                      <option value="pinterest">Pinterest</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Name *</label>
                    <input
                      type="text"
                      name="accountName"
                      value={formData.accountName}
                      onChange={handleInputChange}
                      placeholder="e.g., @yourcompany"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account URL</label>
                    <input
                      type="url"
                      name="accountUrl"
                      value={formData.accountUrl}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Access Token (Optional)</label>
                    <input
                      type="password"
                      name="accessToken"
                      value={formData.accessToken}
                      onChange={handleInputChange}
                      placeholder="For API integration (stored securely)"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">For connecting to social media APIs</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Followers</label>
                      <input
                        type="number"
                        name="followers"
                        value={formData.followers || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, followers: parseInt(e.target.value) || 0 }))}
                        min="0"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div className="flex items-center pt-8">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </>
              )}

              {/* Task Form */}
              {activeTab === 'tasks' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      name="taskDescription"
                      value={formData.taskDescription}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select
                        name="taskStatus"
                        value={formData.taskStatus}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        required
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                      <input
                        type="date"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                      <select
                        name="taskAssignee"
                        value={formData.taskAssignee}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="">Unassigned</option>
                        {companyMembers.map(member => (
                          <option key={member.userId} value={member.userId}>
                            {member.email || member.displayName || 'Unnamed'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {campaigns.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Related Campaign (Optional)</label>
                      <select
                        name="campaignId"
                        value={formData.campaignId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, campaignId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="">None</option>
                        {campaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Asset Form */}
              {activeTab === 'assets' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asset Name *</label>
                    <input
                      type="text"
                      name="assetName"
                      value={formData.assetName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type *</label>
                    <select
                      name="assetType"
                      value={formData.assetType}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="document">Document</option>
                      <option value="template">Template</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asset URL *</label>
                    <input
                      type="url"
                      name="assetUrl"
                      value={formData.assetUrl}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload file to Firebase Storage and paste URL here</p>
                  </div>
                  {campaigns.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Related Campaign (Optional)</label>
                      <select
                        name="campaignId"
                        value={formData.campaignId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, campaignId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="">None</option>
                        {campaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Lead Form */}
              {activeTab === 'leads' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lead Name *</label>
                    <input
                      type="text"
                      name="leadName"
                      value={formData.leadName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        name="leadEmail"
                        value={formData.leadEmail}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        name="leadPhone"
                        value={formData.leadPhone}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <input
                      type="text"
                      name="leadCompany"
                      value={formData.leadCompany || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, leadCompany: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                      <select
                        name="leadSource"
                        value={formData.leadSource}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="">Select source...</option>
                        <option value="website">Website</option>
                        <option value="social">Social Media</option>
                        <option value="referral">Referral</option>
                        <option value="event">Event</option>
                        <option value="email">Email Campaign</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select
                        name="leadStatus"
                        value={formData.leadStatus}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                        required
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  </div>
                  {campaigns.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Related Campaign (Optional)</label>
                      <select
                        name="campaignId"
                        value={formData.campaignId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, campaignId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="">None</option>
                        {campaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <FaSave className="inline mr-2" />
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingTracker;

