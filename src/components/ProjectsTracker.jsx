/**
 * PROJECTS/PRODUCTS TRACKER MODULE
 * 
 * Flexible project and product management system that adapts to any business type:
 * - Software Development (Apps, Features, Releases)
 * - Marketing (Campaigns, Content, Events)
 * - Services (Client Projects, Deliverables)
 * - Products (Development, Manufacturing, Launch)
 * - Retail (Inventory Items, Product Lines)
 * - And more...
 * 
 * Features:
 * - Custom project types and phases
 * - Hierarchical project structure
 * - Task management within projects
 * - Time tracking
 * - Budget tracking
 * - Resource management
 * - Status tracking
 * - Custom fields
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlusCircle,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSave,
  FaFolder,
  FaFolderOpen,
  FaTasks,
  FaClock,
  FaDollarSign,
  FaUsers,
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFilter,
  FaSearch,
  FaTag,
  FaCalendar,
  FaFileAlt,
  FaCog,
  FaLayerGroup,
  FaProjectDiagram,
  FaBox,
  FaCode,
  FaBullhorn,
  FaWrench,
  FaStore,
  FaChevronRight,
  FaChevronDown,
  FaSpinner
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import CompanySelector from './CompanySelector';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyProjects,
  addCompanyProject,
  updateCompanyProject,
  deleteCompanyProject,
  getCompanyProjectConfig,
  updateCompanyProjectConfig,
  getCompanyMembers
} from '../firebase';
import { getHeaderBackground, getHeaderLogo, getPrimaryColor } from '../utils/theme';

const ProjectsTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const headerBackground = useMemo(() => getHeaderBackground(currentCompany), [currentCompany]);
  const headerLogo = useMemo(() => getHeaderLogo(currentCompany), [currentCompany]);
  const accentColor = useMemo(() => getPrimaryColor(currentCompany), [currentCompany]);

  // State Management
  const [projects, setProjects] = useState([]);
  const [projectConfig, setProjectConfig] = useState(null);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [selectedParent, setSelectedParent] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    phase: 'all',
    assignedTo: 'all',
    search: ''
  });

  // Default project configuration (can be customized per company)
  const defaultConfig = {
    projectTypes: [
      { id: 'app', name: 'App Development', icon: 'FaCode', phases: ['Design', 'Development', 'Testing', 'Launch'] },
      { id: 'product', name: 'Product', icon: 'FaBox', phases: ['Planning', 'Development', 'Production', 'Launch'] },
      { id: 'service', name: 'Service Project', icon: 'FaWrench', phases: ['Planning', 'Execution', 'Review', 'Delivery'] },
      { id: 'marketing', name: 'Marketing Campaign', icon: 'FaBullhorn', phases: ['Planning', 'Creation', 'Distribution', 'Analysis'] },
      { id: 'retail', name: 'Retail Item', icon: 'FaStore', phases: ['Sourcing', 'Production', 'Inventory', 'Sales'] }
    ],
    defaultPhases: ['Planning', 'Design', 'Development', 'Testing', 'Launch'],
    statusOptions: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
    priorityOptions: ['low', 'medium', 'high', 'urgent']
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'app',
    status: 'planning',
    phase: '',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: 0,
    actualCost: 0,
    assignedTo: '',
    parentProjectId: null,
    tags: [],
    customFields: {},
    notes: ''
  });

  // Config Form State
  const [configFormData, setConfigFormData] = useState({
    projectTypes: defaultConfig.projectTypes,
    defaultPhases: defaultConfig.defaultPhases,
    statusOptions: defaultConfig.statusOptions,
    priorityOptions: defaultConfig.priorityOptions
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
      const [projectsData, configData, membersData] = await Promise.all([
        getCompanyProjects(currentCompanyId),
        getCompanyProjectConfig(currentCompanyId),
        getCompanyMembers(currentCompanyId)
      ]);
      
      setProjects(projectsData || []);
      if (configData) {
        setProjectConfig(configData);
        setConfigFormData(configData);
      } else {
        // Initialize with default config
        setProjectConfig(defaultConfig);
        setConfigFormData(defaultConfig);
      }
      setCompanyMembers(membersData || []);
    } catch (error) {
      console.error('Error loading projects data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical project structure
  const projectTree = useMemo(() => {
    const rootProjects = projects.filter(p => !p.parentProjectId);
    const childMap = new Map();
    
    projects.forEach(project => {
      if (project.parentProjectId) {
        if (!childMap.has(project.parentProjectId)) {
          childMap.set(project.parentProjectId, []);
        }
        childMap.get(project.parentProjectId).push(project);
      }
    });

    const buildTree = (project) => {
      const children = childMap.get(project.id) || [];
      return {
        ...project,
        children: children.map(buildTree)
      };
    };

    return rootProjects.map(buildTree);
  }, [projects]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalBudget = projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
    const totalCost = projects.reduce((sum, p) => sum + (parseFloat(p.actualCost) || 0), 0);
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const overdueProjects = projects.filter(p => {
      if (!p.endDate || p.status === 'completed' || p.status === 'cancelled') return false;
      const endDate = p.endDate?.toDate ? p.endDate.toDate() : new Date(p.endDate);
      return endDate < new Date();
    }).length;
    
    return {
      activeProjects,
      totalBudget,
      totalCost,
      completedProjects,
      overdueProjects,
      totalProjects: projects.length
    };
  }, [projects]);

  // Get project type icon
  const getProjectTypeIcon = (typeId) => {
    const config = projectConfig || defaultConfig;
    const type = config.projectTypes?.find(t => t.id === typeId);
    if (!type) return FaFolder;
    
    const icons = {
      FaCode: FaCode,
      FaBox: FaBox,
      FaWrench: FaWrench,
      FaBullhorn: FaBullhorn,
      FaStore: FaStore,
      FaFolder: FaFolder
    };
    return icons[type.icon] || FaFolder;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      'on-hold': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.planning;
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleConfigInputChange = (e) => {
    const { name, value } = e.target;
    setConfigFormData(prev => ({
      ...prev,
      [name]: typeof prev[name] === 'object' ? JSON.parse(value) : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentCompanyId || !currentUser) return;

    try {
      const projectData = {
        ...formData,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid
      };

      if (editingItem) {
        await updateCompanyProject(currentCompanyId, editingItem.id, projectData);
      } else {
        await addCompanyProject(currentCompanyId, currentUser.uid, projectData);
      }
      
      await loadAllData();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!currentCompanyId || !currentUser) return;

    try {
      await updateCompanyProjectConfig(currentCompanyId, configFormData);
      setProjectConfig(configFormData);
      setShowConfigModal(false);
      alert('Project configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration. Please try again.');
    }
  };

  const handleDelete = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all child projects.')) return;
    if (!currentCompanyId) return;

    try {
      await deleteCompanyProject(currentCompanyId, projectId);
      await loadAllData();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: projectConfig?.projectTypes?.[0]?.id || 'app',
      status: 'planning',
      phase: '',
      priority: 'medium',
      startDate: '',
      endDate: '',
      budget: 0,
      actualCost: 0,
      assignedTo: '',
      parentProjectId: selectedParent?.id || null,
      tags: [],
      customFields: {},
      notes: ''
    });
    setEditingItem(null);
    setSelectedParent(null);
  };

  const handleEdit = (project) => {
    setEditingItem(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      type: project.type || 'app',
      status: project.status || 'planning',
      phase: project.phase || '',
      priority: project.priority || 'medium',
      startDate: project.startDate?.toDate ? project.startDate.toDate().toISOString().split('T')[0] : (project.startDate || ''),
      endDate: project.endDate?.toDate ? project.endDate.toDate().toISOString().split('T')[0] : (project.endDate || ''),
      budget: project.budget || 0,
      actualCost: project.actualCost || 0,
      assignedTo: project.assignedTo || '',
      parentProjectId: project.parentProjectId || null,
      tags: project.tags || [],
      customFields: project.customFields || {},
      notes: project.notes || ''
    });
    setShowAddModal(true);
  };

  const handleView = (project) => {
    setViewingItem(project);
    setShowDetailDrawer(true);
  };

  const toggleExpand = (projectId) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleNewProject = (parent = null) => {
    setSelectedParent(parent);
    resetForm();
    if (parent) {
      setFormData(prev => ({
        ...prev,
        parentProjectId: parent.id,
        type: parent.type || prev.type
      }));
    }
    setShowAddModal(true);
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.type === filters.type);
    }
    if (filters.phase !== 'all') {
      filtered = filtered.filter(p => p.phase === filters.phase);
    }
    if (filters.assignedTo !== 'all') {
      filtered = filtered.filter(p => p.assignedTo === filters.assignedTo);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [projects, filters]);

  // Render project tree
  const renderProjectTree = (project, level = 0) => {
    const hasChildren = project.children && project.children.length > 0;
    const isExpanded = expandedProjects.has(project.id);
    const TypeIcon = getProjectTypeIcon(project.type);
    const assignedMember = companyMembers.find(m => m.userId === project.assignedTo);

    return (
      <div key={project.id} className="mb-2">
        <div
          className={`
            flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors
            ${level > 0 ? 'ml-6 bg-gray-50' : 'bg-white'}
          `}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(project.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? <FaChevronDown className="w-4 h-4" /> : <FaChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-4" />
          )}
          
          <TypeIcon className="w-5 h-5 text-gray-600" />
          
          <div className="flex-1 cursor-pointer" onClick={() => handleView(project)}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{project.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
              {project.phase && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                  {project.phase}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(project.priority)}`}>
                {project.priority}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {project.description && <span>{project.description.substring(0, 100)}...</span>}
              {assignedMember && (
                <span className="ml-2">• Assigned to: {assignedMember.email}</span>
              )}
              {project.budget > 0 && (
                <span className="ml-2">• Budget: €{project.budget.toLocaleString()}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNewProject(project)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Add sub-project"
            >
              <FaPlusCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEdit(project)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit project"
            >
              <FaEdit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(project.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete project"
            >
              <FaTrash className="w-4 h-4" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4 mt-1">
            {project.children.map(child => renderProjectTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  const config = projectConfig || defaultConfig;

  return (
    <div className="w-full">
      {/* Configure Button - moved to content area */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-end">
        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          title="Configure project types and phases"
        >
          <FaLayerGroup className="w-4 h-4" />
          Configure
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalProjects}</p>
              </div>
              <FaFolder className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.activeProjects}</p>
              </div>
              <FaCheckCircle className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completedProjects}</p>
              </div>
              <FaCheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">€{metrics.totalBudget.toLocaleString()}</p>
              </div>
              <FaDollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{metrics.overdueProjects}</p>
              </div>
              <FaExclamationTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FaSearch className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {config.statusOptions?.map(status => (
                <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {config.projectTypes?.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            <select
              value={filters.phase}
              onChange={(e) => setFilters(prev => ({ ...prev, phase: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Phases</option>
              {config.defaultPhases?.map(phase => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>
            <select
              value={filters.assignedTo}
              onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Assignees</option>
              {companyMembers.map(member => (
                <option key={member.userId} value={member.userId}>{member.email}</option>
              ))}
            </select>
            <button
              onClick={() => handleNewProject()}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlusCircle className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {projectTree.length === 0 ? (
              <div className="text-center py-12">
                <FaFolder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900 mb-2">No projects yet</p>
                <p className="text-gray-600 mb-4">Create your first project to get started</p>
                <button
                  onClick={() => handleNewProject()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Project
                </button>
              </div>
            ) : (
              <div>
                {projectTree.map(project => renderProjectTree(project))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? 'Edit Project' : 'New Project'}
                {selectedParent && ` (under ${selectedParent.name})`}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., App1 - Customer Portal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Project description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Type *
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {config.projectTypes?.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {config.statusOptions?.map(status => (
                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase
                    </label>
                    <select
                      name="phase"
                      value={formData.phase}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Phase</option>
                      {config.defaultPhases?.map(phase => (
                        <option key={phase} value={phase}>{phase}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {config.priorityOptions?.map(priority => (
                        <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget (€)
                    </label>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Cost (€)
                    </label>
                    <input
                      type="number"
                      name="actualCost"
                      value={formData.actualCost}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {companyMembers.map(member => (
                      <option key={member.userId} value={member.userId}>{member.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <FaSave className="w-4 h-4" />
                  {editingItem ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Configure Project Types & Phases</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveConfig} className="px-6 py-4">
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Customize project types and phases to match your business. This configuration will be used for all new projects.
                  </p>
                  <p className="text-sm font-medium text-gray-700 mb-2">Note: Configuration editing coming soon. For now, default types are used.</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Drawer */}
      {showDetailDrawer && viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Project Details</h3>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{viewingItem.name}</h4>
                <p className="text-gray-600">{viewingItem.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium">{config.projectTypes?.find(t => t.id === viewingItem.type)?.name || viewingItem.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(viewingItem.status)}`}>
                    {viewingItem.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phase</p>
                  <p className="font-medium">{viewingItem.phase || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(viewingItem.priority)}`}>
                    {viewingItem.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Budget</p>
                  <p className="font-medium">€{viewingItem.budget?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Actual Cost</p>
                  <p className="font-medium">€{viewingItem.actualCost?.toLocaleString() || '0'}</p>
                </div>
              </div>
              {viewingItem.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-gray-900">{viewingItem.notes}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetailDrawer(false);
                    handleEdit(viewingItem);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Project
                </button>
                <button
                  onClick={() => {
                    setShowDetailDrawer(false);
                    handleNewProject(viewingItem);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Add Sub-Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTracker;

