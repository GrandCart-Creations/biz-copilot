/**
 * PROJECT-MARKETING INTEGRATION COMPONENT
 * 
 * Displays shared project data in Marketing module
 * Shows rollout strategy, timeline, testing data, and user feedback
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanyProjects,
  getUserFeedback,
  linkProjectToCampaign,
  unlinkProjectFromCampaign,
  addCollaborationActivity
} from '../firebase';
import {
  canAccessDataType,
  getAccessLevel,
  SHARING_LEVELS,
  SHARABLE_DATA_TYPES,
  DEPARTMENTS
} from '../utils/collaboration';
import {
  FaProjectDiagram,
  FaCalendar,
  FaUsers,
  FaChartLine,
  FaExclamationTriangle,
  FaCheckCircle,
  FaLink,
  FaComment,
  FaEye,
  FaLock,
  FaUnlink,
  FaClock,
  FaPercent,
  FaCheckCircle as FaCheck,
  FaSpinner
} from 'react-icons/fa';

const ProjectMarketingIntegration = ({ campaignId, onProjectLink }) => {
  const { currentCompanyId } = useCompany();
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentCompanyId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [currentCompanyId, campaignId]);

  // Check for already linked project when campaignId or projects change
  useEffect(() => {
    if (campaignId && projects.length > 0 && !selectedProject) {
      const linkedProject = projects.find(p => p.linkedCampaignId === campaignId);
      if (linkedProject) {
        setSelectedProject(linkedProject.id);
        setProjectDetails(linkedProject);
      }
    }
    // If we have a selected project, update its details when projects change
    if (selectedProject && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProject);
      if (project) {
        setProjectDetails(project);
      }
    }
  }, [campaignId, projects, selectedProject]);

  const loadData = async () => {
    if (!currentCompanyId) {
      setLoading(false);
      setProjects([]);
      setFeedback([]);
      return;
    }

    try {
      setLoading(true);
      
      // Try to load projects - handle missing index gracefully
      let projectsData = [];
      try {
        projectsData = await getCompanyProjects(currentCompanyId) || [];
      } catch (projectError) {
        console.error('Error loading projects:', projectError);
        // If it's an index error, try without orderBy
        if (projectError.message && projectError.message.includes('index')) {
          console.warn('Firestore index missing, trying without orderBy...');
          try {
            projectsData = await getCompanyProjects(currentCompanyId, { orderBy: null }) || [];
          } catch (retryError) {
            console.error('Error loading projects (retry):', retryError);
            // If still fails, just set empty array - don't show error to user
            projectsData = [];
          }
        } else {
          // For other errors, still set empty array but log it
          projectsData = [];
        }
      }

      // Load feedback - handle errors gracefully
      let feedbackData = [];
      try {
        feedbackData = await getUserFeedback(currentCompanyId, { 
          linkedCampaignId: campaignId,
          linkedProjectId: selectedProject 
        }) || [];
      } catch (feedbackError) {
        console.error('Error loading feedback:', feedbackError);
        // Don't show error for feedback - it's optional
        feedbackData = [];
      }

      setProjects(projectsData);
      setFeedback(feedbackData);
      setError(null); // Clear any previous errors
      
      // Update project details if we have a selected project
      if (selectedProject && projectsData.length > 0) {
        const project = projectsData.find(p => p.id === selectedProject);
        if (project) {
          setProjectDetails(project);
        }
      }
    } catch (error) {
      console.error('Unexpected error loading project data:', error);
      // Set error state for display, but don't show alert
      setError(error.message || 'Failed to load project data');
      setProjects([]);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = async (projectId) => {
    if (!projectId) {
      setSelectedProject(null);
      setProjectDetails(null);
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) {
      alert('Project not found');
      return;
    }

    setSelectedProject(projectId);
    setProjectDetails(project);

    // Check if Marketing can access this project data
    const canAccess = canAccessDataType(
      DEPARTMENTS.PROJECTS,
      DEPARTMENTS.MARKETING,
      SHARABLE_DATA_TYPES.PROJECT_DETAILS
    );

    if (!canAccess) {
      alert('You do not have permission to view this project data.');
      return;
    }

    // Link project to campaign if campaignId is provided
    if (campaignId) {
      try {
        setLinking(true);
        await linkProjectToCampaign(currentCompanyId, projectId, campaignId, currentUser?.uid);
        // Reload data to get updated project with link
        await loadData();
        if (onProjectLink) onProjectLink(projectId);
        // Show success message
        alert(`Project "${project.name}" successfully linked to campaign!`);
      } catch (error) {
        console.error('Error linking project:', error);
        alert('Error linking project to campaign. Please try again.');
      } finally {
        setLinking(false);
      }
    } else {
      // If no campaign is selected, just show the project details
      // User can link it later when they select a campaign
      console.log('Project selected but no campaign to link to');
    }
  };

  const handleUnlink = async () => {
    if (!campaignId || !selectedProject) {
      alert('No link to remove');
      return;
    }

    if (!window.confirm('Are you sure you want to unlink this project from the campaign? This will remove the connection between Marketing and Projects.')) {
      return;
    }

    try {
      setUnlinking(true);
      await unlinkProjectFromCampaign(currentCompanyId, selectedProject, campaignId, currentUser?.uid);
      // Reload data to get updated project without link
      await loadData();
      // Keep the project selected but show it's not linked
      alert('Project unlinked from campaign successfully.');
    } catch (error) {
      console.error('Error unlinking project:', error);
      alert('Error unlinking project. Please try again.');
    } finally {
      setUnlinking(false);
    }
  };

  // Calculate build progress based on phase
  const getBuildProgress = (project) => {
    if (!project) return 0;
    
    const phases = ['planning', 'design', 'development', 'testing', 'launch', 'completed'];
    const currentPhase = (project.phase || project.status || '').toLowerCase();
    const phaseIndex = phases.findIndex(p => p === currentPhase);
    
    if (phaseIndex === -1) {
      // If phase not found, estimate based on status
      if (project.status === 'completed') return 100;
      if (project.status === 'active') return 50;
      if (project.status === 'planning') return 10;
      return 0;
    }
    
    return Math.round(((phaseIndex + 1) / phases.length) * 100);
  };

  // Get phase progression timeline
  const getPhaseTimeline = (project) => {
    if (!project) return [];
    
    const allPhases = ['Planning', 'Design', 'Development', 'Testing', 'Launch', 'Completed'];
    const currentPhase = project.phase || project.status || '';
    const currentPhaseIndex = allPhases.findIndex(p => p.toLowerCase() === currentPhase.toLowerCase());
    
    return allPhases.map((phase, index) => ({
      name: phase,
      completed: index < currentPhaseIndex,
      current: index === currentPhaseIndex,
      upcoming: index > currentPhaseIndex
    }));
  };

  const canViewTimeline = canAccessDataType(
    DEPARTMENTS.PROJECTS,
    DEPARTMENTS.MARKETING,
    SHARABLE_DATA_TYPES.PROJECT_TIMELINE
  );

  const canViewRollout = canAccessDataType(
    DEPARTMENTS.PROJECTS,
    DEPARTMENTS.MARKETING,
    SHARABLE_DATA_TYPES.ROLLOUT_STRATEGY
  );

  const canViewFeedback = canAccessDataType(
    DEPARTMENTS.PROJECTS,
    DEPARTMENTS.MARKETING,
    SHARABLE_DATA_TYPES.USER_FEEDBACK
  );

  // Early return if no company ID
  if (!currentCompanyId) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="p-4 text-center text-gray-500">
          <p>No company selected. Please select a company to view projects.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="p-4 text-center text-gray-500">Loading project data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FaProjectDiagram className="text-indigo-600" />
          Linked Project Information
        </h3>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Error loading projects</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  loadData();
                }}
                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Select Project
          </label>
          {selectedProject && campaignId && projectDetails?.linkedCampaignId === campaignId && (
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              title="Unlink project from campaign"
            >
              {unlinking ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <>
                  <FaUnlink />
                  Unlink
                </>
              )}
            </button>
          )}
        </div>
        {projects.length === 0 && !error ? (
          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
            No projects available. Create a project in the Projects module first.
          </div>
        ) : (
          <select
            value={selectedProject || ''}
            onChange={(e) => handleProjectSelect(e.target.value)}
            disabled={linking || !!error}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">-- Select a project --</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.status || 'N/A'})
                {project.linkedCampaignId === campaignId ? ' ✓ Linked' : ''}
              </option>
            ))}
          </select>
        )}
        {linking && (
          <p className="mt-2 text-xs text-blue-600 flex items-center gap-1">
            <FaSpinner className="animate-spin" />
            Linking project...
          </p>
        )}
      </div>

      {projectDetails && (
        <div className="space-y-6">
          {/* Project Overview */}
          <div className="border-b pb-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{projectDetails.name}</h4>
                <p className="text-sm text-gray-600">{projectDetails.description}</p>
              </div>
              {projectDetails.linkedCampaignId === campaignId && (
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                  <FaLink className="w-3 h-3" />
                  Linked
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                Status: <span className="font-medium">{projectDetails.status || 'N/A'}</span>
              </span>
              {projectDetails.phase && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  Phase: <span className="font-medium">{projectDetails.phase}</span>
                </span>
              )}
              {projectDetails.priority && (
                <span className={`px-2 py-1 rounded ${
                  projectDetails.priority === 'high' ? 'bg-red-100 text-red-700' :
                  projectDetails.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  Priority: <span className="font-medium">{projectDetails.priority}</span>
                </span>
              )}
            </div>
            {(projectDetails.budget || projectDetails.actualCost) && (
              <div className="flex items-center gap-4 mt-2 text-sm">
                {projectDetails.budget > 0 && (
                  <span className="text-gray-600">
                    Budget: <span className="font-medium">€{projectDetails.budget.toFixed(2)}</span>
                  </span>
                )}
                {projectDetails.actualCost > 0 && (
                  <span className="text-gray-600">
                    Actual: <span className="font-medium">€{projectDetails.actualCost.toFixed(2)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Build Progress */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                <FaPercent className="text-blue-600" />
                Build Progress
              </h5>
              <span className="text-sm font-semibold text-blue-600">
                {getBuildProgress(projectDetails)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getBuildProgress(projectDetails)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Current Phase: <span className="font-medium text-gray-700">{projectDetails.phase || projectDetails.status || 'Not set'}</span>
            </p>
          </div>

          {/* Build Timeline with Phases */}
          {canViewTimeline && (
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FaCalendar className="text-blue-600" />
                  Build Planning Timeline
                </h5>
                <FaEye className="text-green-600" title="View Only" />
              </div>
              
              {/* Phase Timeline */}
              <div className="space-y-2 mb-3">
                {getPhaseTimeline(projectDetails).map((phase, index) => (
                  <div key={phase.name} className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      phase.completed
                        ? 'bg-green-500 text-white'
                        : phase.current
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {phase.completed ? (
                        <FaCheck className="w-3 h-3" />
                      ) : phase.current ? (
                        <FaSpinner className="w-3 h-3 animate-spin" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span className={`flex-1 ${
                      phase.completed
                        ? 'text-green-700 font-medium'
                        : phase.current
                        ? 'text-blue-700 font-semibold'
                        : 'text-gray-500'
                    }`}>
                      {phase.name}
                      {phase.current && <span className="ml-2 text-xs">(Current)</span>}
                    </span>
                  </div>
                ))}
              </div>

              {/* Date Range */}
              <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
                {projectDetails.startDate && (
                  <p className="flex items-center gap-2">
                    <FaClock className="text-gray-400" />
                    <span>Start: {projectDetails.startDate.toDate?.().toLocaleDateString() || projectDetails.startDate}</span>
                  </p>
                )}
                {projectDetails.endDate && (
                  <p className="flex items-center gap-2">
                    <FaClock className="text-gray-400" />
                    <span>Target End: {projectDetails.endDate.toDate?.().toLocaleDateString() || projectDetails.endDate}</span>
                  </p>
                )}
                {projectDetails.startDate && projectDetails.endDate && (
                  <p className="text-xs text-gray-500 mt-2">
                    {(() => {
                      const start = projectDetails.startDate.toDate?.() || new Date(projectDetails.startDate);
                      const end = projectDetails.endDate.toDate?.() || new Date(projectDetails.endDate);
                      const today = new Date();
                      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                      const daysElapsed = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
                      return `${daysElapsed} of ${totalDays} days elapsed`;
                    })()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Rollout Strategy */}
          {canViewRollout && (
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FaChartLine className="text-purple-600" />
                  Rollout Strategy
                </h5>
                <FaComment className="text-blue-600" title="Can Comment" />
              </div>
              {projectDetails.customFields?.rolloutStrategy ? (
                <p className="text-sm text-gray-600">{projectDetails.customFields.rolloutStrategy}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">No rollout strategy defined yet</p>
              )}
            </div>
          )}

          {/* User Feedback */}
          {canViewFeedback && feedback.length > 0 && (
            <div>
              <h5 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <FaUsers className="text-green-600" />
                User Feedback ({feedback.length})
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {feedback.map((item) => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{item.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-gray-600">{item.description}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.userEmail && <span>From: {item.userEmail}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access Restrictions Notice */}
          {(!canViewTimeline || !canViewRollout) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <FaLock className="text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Limited Access</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Some project details are restricted. Contact the Projects department for full access.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedProject && (
        <div className="text-center py-8 text-gray-500">
          <FaProjectDiagram className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Select a project to view shared information</p>
        </div>
      )}
    </div>
  );
};

export default ProjectMarketingIntegration;

