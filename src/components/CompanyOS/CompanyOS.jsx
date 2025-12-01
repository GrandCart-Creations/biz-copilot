/**
 * COMPANY OS - Main Component
 * 
 * Central hub for company document management, business planning, and strategic operations
 * Features:
 * - Folder-based file organization
 * - Business Plans
 * - Roadmaps
 * - Goals & Tasks
 * - AI-assisted planning
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import BusinessPlans from './BusinessPlans';
import Roadmaps from './Roadmaps';
import GoalsTracker from './GoalsTracker';
import TaskManager from './TaskManager';
import FileManager from './FileManager';
import {
  FaFolder,
  FaFileAlt,
  FaRoute,
  FaBullseye,
  FaTasks,
  FaFolderOpen,
  FaPlus,
  FaSearch,
  FaRobot
} from 'react-icons/fa';

const FOLDER_STRUCTURE = [
  {
    id: 'admin',
    name: '1. Admin',
    icon: FaFolder,
    description: 'KvK & Legal, Banking, Insurance, Taxes',
    color: 'blue',
    subfolders: [
      { id: 'kvk-legal', name: 'KvK & Legal' },
      { id: 'banking', name: 'Banking & Payments' },
      { id: 'insurance', name: 'Insurance' },
      { id: 'taxes', name: 'Taxes & Accounting' }
    ]
  },
  {
    id: 'finance',
    name: '2. Finance',
    icon: FaFolder,
    description: 'Budgets, Expenses, Income, Investments',
    color: 'green',
    subfolders: [
      { id: 'budgets', name: 'Budgets & Forecasts' },
      { id: 'expenses', name: 'Expenses' },
      { id: 'income', name: 'Income' },
      { id: 'investments', name: 'Investments & Funding' }
    ]
  },
  {
    id: 'operations',
    name: '3. Operations',
    icon: FaFolder,
    description: 'Employees, Office Admin, Suppliers',
    color: 'orange',
    subfolders: [
      { id: 'employees', name: 'Employees & Freelancers' },
      { id: 'office', name: 'Office Admin' },
      { id: 'suppliers', name: 'Suppliers & Partners' }
    ]
  },
  {
    id: 'projects',
    name: '4. Projects',
    icon: FaFolder,
    description: 'Active projects and shared assets',
    color: 'purple',
    subfolders: [
      { id: 'active', name: 'Active Projects' },
      { id: 'shared', name: 'Shared Assets' }
    ]
  },
  {
    id: 'marketing',
    name: '5. Marketing',
    icon: FaFolder,
    description: 'Branding, PR, Social Media, Websites',
    color: 'pink',
    subfolders: [
      { id: 'branding', name: 'Branding' },
      { id: 'pr', name: 'Press & PR' },
      { id: 'social', name: 'Social Media' },
      { id: 'websites', name: 'Websites & Services' }
    ]
  },
  {
    id: 'knowledge',
    name: '6. Knowledge Base',
    icon: FaFolder,
    description: 'Research, Ideas, Learning Resources',
    color: 'teal',
    subfolders: [
      { id: 'research', name: 'Competitors Research' },
      { id: 'ideas', name: 'Ideas & Notes' },
      { id: 'learning', name: 'Learning Resources' }
    ]
  },
  {
    id: 'strategic',
    name: 'Strategic Planning',
    icon: FaRoute,
    description: 'Business Plans, Roadmaps, Goals',
    color: 'indigo',
    special: true
  }
];

const CompanyOS = () => {
  const { currentCompany, currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const canEdit = ['owner', 'manager'].includes(userRole);

  const handleFolderClick = (folder) => {
    if (folder.special) {
      setActiveView('strategic');
    } else {
      setSelectedFolder(folder);
      setActiveView('files');
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'strategic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveView('business-plans')}
                className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-indigo-500 transition-all text-left group"
              >
                <FaFileAlt className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Business Plans</h3>
                <p className="text-sm text-gray-600">Create and manage strategic business plans</p>
              </button>
              <button
                onClick={() => setActiveView('roadmaps')}
                className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-indigo-500 transition-all text-left group"
              >
                <FaRoute className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Roadmaps</h3>
                <p className="text-sm text-gray-600">Plan your company's future direction</p>
              </button>
              <button
                onClick={() => setActiveView('goals')}
                className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-indigo-500 transition-all text-left group"
              >
                <FaBullseye className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Goals</h3>
                <p className="text-sm text-gray-600">Set and track strategic goals</p>
              </button>
              <button
                onClick={() => setActiveView('tasks')}
                className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-indigo-500 transition-all text-left group"
              >
                <FaTasks className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Tasks</h3>
                <p className="text-sm text-gray-600">Daily, weekly, monthly task management</p>
              </button>
            </div>
          </div>
        );
      case 'business-plans':
        return <BusinessPlans onBack={() => setActiveView('strategic')} />;
      case 'roadmaps':
        return <Roadmaps onBack={() => setActiveView('strategic')} />;
      case 'goals':
        return <GoalsTracker onBack={() => setActiveView('strategic')} />;
      case 'tasks':
        return <TaskManager onBack={() => setActiveView('strategic')} />;
      case 'files':
        return <FileManager folder={selectedFolder} onBack={() => setActiveView('overview')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#005C70] to-[#00BFA6] rounded-lg flex items-center justify-center">
              <FaFolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Biz-CoPilot Company OS</h1>
              <p className="text-sm text-gray-600">
                Organize knowledge, files, and workflows inside structured folders aligned with your operating system
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files, plans, goals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              />
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  if (activeView === 'strategic') {
                    setActiveView('business-plans');
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
              >
                <FaPlus className="w-4 h-4" />
                New
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Folder Structure */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-120px)] p-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveView('overview')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                activeView === 'overview'
                  ? 'bg-[#F0FBF8] text-[#005C70] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <FaFolderOpen className="w-5 h-5" />
                <span>Overview</span>
              </div>
            </button>
            {FOLDER_STRUCTURE.map((folder) => {
              const Icon = folder.icon;
              return (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    selectedFolder?.id === folder.id || (folder.special && activeView === 'strategic')
                      ? 'bg-[#F0FBF8] text-[#005C70] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${
                      folder.color === 'blue' ? 'text-blue-600' :
                      folder.color === 'green' ? 'text-green-600' :
                      folder.color === 'orange' ? 'text-orange-600' :
                      folder.color === 'purple' ? 'text-purple-600' :
                      folder.color === 'pink' ? 'text-pink-600' :
                      folder.color === 'teal' ? 'text-teal-600' :
                      folder.color === 'indigo' ? 'text-indigo-600' :
                      'text-gray-600'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium">{folder.name}</div>
                      {folder.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{folder.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeView === 'overview' ? (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-[#F0FBF8] to-[#EAF4F6] rounded-lg p-6 border border-[#B8E5DC]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#005C70] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaRobot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Welcome to {currentCompany?.name || 'Your Company'} OS
                    </h2>
                    <p className="text-gray-700 mb-4">
                      Your centralized hub for business planning, goal tracking, and strategic execution. 
                      Use the folder structure to organize documents, or dive into Strategic Planning to create 
                      business plans, roadmaps, and goals.
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setActiveView('strategic')}
                        className="px-4 py-2 bg-[#005C70] text-white rounded-lg hover:bg-[#014A5A] transition-all"
                      >
                        Start Strategic Planning
                      </button>
                      <button
                        onClick={() => setActiveView('tasks')}
                        className="px-4 py-2 bg-white border border-[#005C70] text-[#005C70] rounded-lg hover:bg-[#F0FBF8] transition-all"
                      >
                        View My Tasks
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Business Plans</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Active Roadmaps</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Active Goals</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Tasks This Week</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
              </div>

              {/* Folder Grid */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Folders</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FOLDER_STRUCTURE.map((folder) => {
                    const Icon = folder.icon;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => handleFolderClick(folder)}
                        className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-[#00BFA6] transition-all text-left group"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            folder.color === 'blue' ? 'bg-blue-100' :
                            folder.color === 'green' ? 'bg-green-100' :
                            folder.color === 'orange' ? 'bg-orange-100' :
                            folder.color === 'purple' ? 'bg-purple-100' :
                            folder.color === 'pink' ? 'bg-pink-100' :
                            folder.color === 'teal' ? 'bg-teal-100' :
                            folder.color === 'indigo' ? 'bg-indigo-100' :
                            'bg-gray-100'
                          }`}>
                            <Icon className={`w-6 h-6 ${
                              folder.color === 'blue' ? 'text-blue-600' :
                              folder.color === 'green' ? 'text-green-600' :
                              folder.color === 'orange' ? 'text-orange-600' :
                              folder.color === 'purple' ? 'text-purple-600' :
                              folder.color === 'pink' ? 'text-pink-600' :
                              folder.color === 'teal' ? 'text-teal-600' :
                              folder.color === 'indigo' ? 'text-indigo-600' :
                              'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 group-hover:text-[#005C70]">
                              {folder.name}
                            </h4>
                            {folder.description && (
                              <p className="text-sm text-gray-600 mt-1">{folder.description}</p>
                            )}
                          </div>
                        </div>
                        {folder.subfolders && (
                          <div className="text-xs text-gray-500">
                            {folder.subfolders.length} subfolders
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyOS;

