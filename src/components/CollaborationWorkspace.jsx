/**
 * COLLABORATION WORKSPACE
 * 
 * Shared workspace for inter-departmental collaboration
 * Enables Marketing, Projects, and other departments to work together
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getCollaborationWorkspace,
  getCollaborationActivities,
  addCollaborationActivity
} from '../firebase';
import {
  DEPARTMENTS,
  SHARING_LEVELS,
  ACTIVITY_TYPES,
  WORKSPACE_TYPES
} from '../utils/collaboration';
import {
  FaUsers,
  FaComments,
  FaBell,
  FaLink,
  FaChartLine,
  FaCalendar,
  FaFileAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';

const CollaborationWorkspace = ({ workspaceId }) => {
  const { currentCompanyId } = useCompany();
  const { currentUser } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompanyId || !workspaceId) return;
    loadWorkspace();
  }, [currentCompanyId, workspaceId]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      const [workspaceData, activitiesData] = await Promise.all([
        getCollaborationWorkspace(currentCompanyId, workspaceId),
        getCollaborationActivities(currentCompanyId, { limit: 50 })
      ]);
      setWorkspace(workspaceData);
      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error loading workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading workspace...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Workspace not found</div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Workspace Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{workspace.name}</h2>
            <p className="text-gray-600 mt-1">{workspace.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {workspace.type}
            </span>
          </div>
        </div>

        {/* Departments */}
        <div className="flex items-center gap-2 mb-4">
          <FaUsers className="text-gray-500" />
          <span className="text-sm text-gray-600">Departments:</span>
          {workspace.departments?.map((dept, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
              {dept}
            </span>
          ))}
        </div>

        {/* Linked Resources */}
        {(workspace.linkedProjectId || workspace.linkedCampaignId) && (
          <div className="flex items-center gap-4">
            <FaLink className="text-gray-500" />
            {workspace.linkedProjectId && (
              <span className="text-sm text-gray-600">
                Project: {workspace.linkedProjectId}
              </span>
            )}
            {workspace.linkedCampaignId && (
              <span className="text-sm text-gray-600">
                Campaign: {workspace.linkedCampaignId}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaBell className="text-blue-600" />
            Activity Feed
          </h3>
        </div>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaInfoCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No activities yet</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{activity.title}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        {activity.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>From: {activity.sourceDepartment}</span>
                      {activity.targetDepartments?.length > 0 && (
                        <span>To: {activity.targetDepartments.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationWorkspace;

