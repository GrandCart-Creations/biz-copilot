/**
 * MARKETING-PROJECTS INTEGRATION COMPONENT
 * 
 * Displays shared marketing data in Projects module
 * Shows campaign strategy, performance, and alignment with project rollout
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanyCampaigns,
  getUserFeedback,
  linkProjectToCampaign
} from '../firebase';
import {
  canAccessDataType,
  getAccessLevel,
  SHARING_LEVELS,
  SHARABLE_DATA_TYPES,
  DEPARTMENTS
} from '../utils/collaboration';
import {
  FaBullhorn,
  FaChartLine,
  FaUsers,
  FaDollarSign,
  FaEye,
  FaComment,
  FaLink,
  FaLock,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

const MarketingProjectsIntegration = ({ projectId, onCampaignLink }) => {
  const { currentCompanyId } = useCompany();
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompanyId) return;
    loadData();
  }, [currentCompanyId, projectId]);

  // Check for already linked campaign when projectId or campaigns change
  useEffect(() => {
    if (projectId && campaigns.length > 0 && !selectedCampaign) {
      const linkedCampaign = campaigns.find(c => c.linkedProjectId === projectId);
      if (linkedCampaign) {
        setSelectedCampaign(linkedCampaign.id);
        setCampaignDetails(linkedCampaign);
      }
    }
    // If projectId changes and we have a selected campaign, check if it's still linked
    if (projectId && selectedCampaign) {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      if (campaign && campaign.linkedProjectId !== projectId) {
        // Campaign is no longer linked to this project, clear selection
        setSelectedCampaign(null);
        setCampaignDetails(null);
      }
    }
  }, [projectId, campaigns, selectedCampaign]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignsData, feedbackData] = await Promise.all([
        getCompanyCampaigns(currentCompanyId),
        getUserFeedback(currentCompanyId, { linkedProjectId: projectId })
      ]);
      setCampaigns(campaignsData || []);
      setFeedback(feedbackData || []);
    } catch (error) {
      console.error('Error loading campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignSelect = async (campaignId) => {
    if (!campaignId) {
      setSelectedCampaign(null);
      setCampaignDetails(null);
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      alert('Campaign not found');
      return;
    }

    setSelectedCampaign(campaignId);
    setCampaignDetails(campaign);

    // Check if Projects can access this campaign data
    const canAccess = canAccessDataType(
      DEPARTMENTS.MARKETING,
      DEPARTMENTS.PROJECTS,
      SHARABLE_DATA_TYPES.CAMPAIGN_STRATEGY
    );

    if (!canAccess) {
      alert('You do not have permission to view this campaign data.');
      return;
    }

    // Link campaign to project if projectId is provided
    if (projectId) {
      try {
        await linkProjectToCampaign(currentCompanyId, projectId, campaignId, currentUser?.uid);
        // Reload data to get updated campaign with link
        await loadData();
        if (onCampaignLink) onCampaignLink(campaignId);
        // Show success message
        alert(`Campaign "${campaign.name}" successfully linked to project!`);
      } catch (error) {
        console.error('Error linking campaign:', error);
        alert('Error linking campaign to project. Please try again.');
      }
    } else {
      // If no project is selected, just show the campaign details
      // User can link it later when they select a project
      console.log('Campaign selected but no project to link to');
    }
  };

  const canViewStrategy = canAccessDataType(
    DEPARTMENTS.MARKETING,
    DEPARTMENTS.PROJECTS,
    SHARABLE_DATA_TYPES.CAMPAIGN_STRATEGY
  );

  const canViewPerformance = canAccessDataType(
    DEPARTMENTS.MARKETING,
    DEPARTMENTS.PROJECTS,
    SHARABLE_DATA_TYPES.CAMPAIGN_PERFORMANCE
  );

  const canViewFeedback = canAccessDataType(
    DEPARTMENTS.MARKETING,
    DEPARTMENTS.PROJECTS,
    SHARABLE_DATA_TYPES.USER_FEEDBACK
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="p-4 text-center text-gray-500">Loading campaign data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FaBullhorn className="text-orange-600" />
          Linked Marketing Campaign
        </h3>
      </div>

      {/* Campaign Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Campaign
        </label>
        {campaigns.length === 0 ? (
          <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
            No campaigns available. Create a campaign in the Marketing module first.
          </div>
        ) : (
          <select
            value={selectedCampaign || ''}
            onChange={(e) => handleCampaignSelect(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">-- Select a campaign --</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} ({campaign.status || 'N/A'})
              </option>
            ))}
          </select>
        )}
      </div>

      {campaignDetails && (
        <div className="space-y-6">
          {/* Campaign Overview */}
          <div className="border-b pb-4">
            <h4 className="font-semibold text-gray-900 mb-2">{campaignDetails.name}</h4>
            <p className="text-sm text-gray-600">{campaignDetails.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-gray-500">Status: {campaignDetails.status}</span>
              <span className="text-gray-500">Type: {campaignDetails.type}</span>
              {campaignDetails.budget && (
                <span className="text-gray-500">
                  Budget: €{campaignDetails.budget.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Campaign Strategy */}
          {canViewStrategy && (
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FaChartLine className="text-purple-600" />
                  Campaign Strategy
                </h5>
                <FaEye className="text-green-600" title="View Only" />
              </div>
              {campaignDetails.targetAudience && (
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Target Audience:</strong> {campaignDetails.targetAudience}</p>
                  {campaignDetails.goals && campaignDetails.goals.length > 0 && (
                    <div>
                      <strong>Goals:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {campaignDetails.goals.map((goal, idx) => (
                          <li key={idx}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {campaignDetails.channels && campaignDetails.channels.length > 0 && (
                    <div>
                      <strong>Channels:</strong> {campaignDetails.channels.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Campaign Performance */}
          {canViewPerformance && campaignDetails.metrics && (
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FaChartLine className="text-blue-600" />
                  Campaign Performance
                </h5>
                <FaComment className="text-blue-600" title="Can Comment" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Impressions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {campaignDetails.metrics.impressions?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Clicks</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {campaignDetails.metrics.clicks?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Conversions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {campaignDetails.metrics.conversions?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Revenue</p>
                  <p className="text-lg font-semibold text-green-600">
                    €{campaignDetails.metrics.revenue?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access Restrictions Notice */}
          {(!canViewStrategy || !canViewPerformance) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <FaLock className="text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Limited Access</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Some campaign details are restricted. Contact the Marketing department for full access.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedCampaign && (
        <div className="text-center py-8 text-gray-500">
          <FaBullhorn className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Select a campaign to view shared information</p>
        </div>
      )}
    </div>
  );
};

export default MarketingProjectsIntegration;

