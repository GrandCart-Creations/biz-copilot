/**
 * PERSON WORKSPACE
 * 
 * Individual workspace view for a team member showing:
 * - Their assigned tasks (daily/weekly/monthly/yearly)
 * - Goals they're working on
 * - AI-powered task suggestions
 * - Performance metrics
 * - Responsibilities
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { processAIQuery } from '../../utils/aiEngine';
import {
  FaTasks,
  FaBullseye,
  FaRobot,
  FaLightbulb,
  FaChartLine,
  FaCheckCircle,
  FaCircle,
  FaCalendar,
  FaClock,
  FaUser,
  FaFileAlt,
  FaArrowLeft
} from 'react-icons/fa';

const PersonWorkspace = ({ member, onBack, canEdit, profileData }) => {
  const { currentCompanyId } = useCompany();
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [timeframe, setTimeframe] = useState('week');
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    tasksPending: 0,
    goalsActive: 0,
    goalsCompleted: 0,
    completionRate: 0
  });
  
  // Use profileData if provided, otherwise use member data
  const form = profileData || {};

  useEffect(() => {
    if (currentCompanyId && member?.userId) {
      console.log('[PersonWorkspace] Loading data for member:', member.displayName || member.email);
      loadPersonData();
    }
  }, [currentCompanyId, member?.userId, timeframe]);

  useEffect(() => {
    if (currentCompanyId && member?.userId) {
      loadAISuggestions();
    }
  }, [currentCompanyId, member?.userId, timeframe]);

  const loadPersonData = async () => {
    if (!currentCompanyId || !member?.userId) return;

    setLoading(true);
    try {
      // Load tasks assigned to this person
      const tasksRef = collection(db, 'companies', currentCompanyId, 'tasks');
      
      // Try query with dueDate ordering first, fallback to simpler query if it fails
      let tasksQuery;
      try {
        tasksQuery = query(
          tasksRef,
          where('deleted', '!=', true),
          where('assignedTo', '==', member.userId),
          where('timeframe', '==', timeframe),
          orderBy('dueDate', 'asc')
        );
      } catch (error) {
        // If ordering fails (no index), use simpler query
        console.warn('Could not order by dueDate, using simpler query:', error);
        tasksQuery = query(
          tasksRef,
          where('deleted', '!=', true),
          where('assignedTo', '==', member.userId),
          where('timeframe', '==', timeframe)
        );
      }
      
      const tasksSnapshot = await getDocs(tasksQuery);
      let tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by dueDate if not already sorted (client-side fallback)
      tasksData.sort((a, b) => {
        const aDate = a.dueDate?.toDate?.() || a.dueDate || new Date(0);
        const bDate = b.dueDate?.toDate?.() || b.dueDate || new Date(0);
        return aDate - bDate;
      });
      
      setTasks(tasksData);

      // Load goals - filter by assigned person or relevant to their role
      const goalsRef = collection(db, 'companies', currentCompanyId, 'goals');
      const goalsSnapshot = await getDocs(query(goalsRef, where('deleted', '!=', true), where('status', '==', 'active')));
      let goalsData = goalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter goals that are assigned to this person or relevant to their role
      // For now, show all active goals (can be enhanced later with assignment logic)
      setGoals(goalsData);

      // Calculate stats
      const completed = tasksData.filter(t => t.status === 'completed').length;
      const pending = tasksData.filter(t => t.status !== 'completed').length;
      const completionRate = tasksData.length > 0 ? (completed / tasksData.length) * 100 : 0;

      setStats({
        tasksCompleted: completed,
        tasksPending: pending,
        goalsActive: goalsData.length,
        goalsCompleted: 0,
        completionRate: Math.round(completionRate)
      });
    } catch (error) {
      console.error('Error loading person data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAISuggestions = async () => {
    if (!currentCompanyId || !member?.userId || !currentUser) return;

    setLoadingSuggestions(true);
    try {
      const memberName = member.displayName || member.email || 'this team member';
      const memberRole = member.role || form?.role || 'employee';
      const memberDept = form?.department || 'their department';
      const memberResponsibilities = form?.responsibilities || '';
      
      const queryText = `Based on ${memberName}'s role (${memberRole}) in ${memberDept}, ${memberResponsibilities ? `their responsibilities: ${memberResponsibilities}, ` : ''}and current ${timeframe}ly tasks, suggest 3-5 specific actionable tasks they should focus on. Make suggestions practical and aligned with their role and company goals.`;
      
      const response = await processAIQuery(queryText, 'global', currentCompanyId, currentUser.uid);
      
      if (response && response.suggestions) {
        let suggestions = [];
        if (Array.isArray(response.suggestions)) {
          suggestions = response.suggestions;
        } else if (typeof response.suggestions === 'string') {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(response.suggestions);
            suggestions = Array.isArray(parsed) ? parsed : [response.suggestions];
          } catch {
            // If not JSON, split by newlines
            suggestions = response.suggestions.split('\n').filter(s => s.trim());
          }
        }
        
        // Clean up suggestions (remove numbering, bullets, etc.)
        suggestions = suggestions
          .map(s => s.replace(/^[\d\-•\*]\s*/, '').trim())
          .filter(s => s.length > 10) // Filter out very short suggestions
          .slice(0, 5);
        
        setAiSuggestions(suggestions);
      } else {
        setAiSuggestions([]);
      }
    } catch (error) {
      console.error('Error loading AI suggestions:', error);
      setAiSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#005C70] to-[#00BFA6] rounded-full flex items-center justify-center text-white font-semibold">
              {member?.displayName?.[0]?.toUpperCase() || member?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {member?.displayName || member?.email}
              </h2>
              <p className="text-sm text-gray-600 capitalize">{member?.role || 'employee'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setTimeframe('day')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              timeframe === 'day' ? 'bg-[#005C70] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              timeframe === 'week' ? 'bg-[#005C70] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              timeframe === 'month' ? 'bg-[#005C70] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('year')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              timeframe === 'year' ? 'bg-[#005C70] text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <FaCheckCircle className="w-5 h-5 text-green-600" />
            <div className="text-sm text-gray-600">Completed Tasks</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.tasksCompleted}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <FaCircle className="w-5 h-5 text-yellow-600" />
            <div className="text-sm text-gray-600">Pending Tasks</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.tasksPending}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <FaBullseye className="w-5 h-5 text-indigo-600" />
            <div className="text-sm text-gray-600">Active Goals</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.goalsActive}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <FaChartLine className="w-5 h-5 text-blue-600" />
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.completionRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Task Suggestions */}
        <div className="bg-gradient-to-r from-[#F0FBF8] to-[#EAF4F6] rounded-lg p-6 border border-[#B8E5DC]">
          <div className="flex items-center gap-3 mb-4">
            <FaRobot className="w-6 h-6 text-[#005C70]" />
            <h3 className="text-lg font-semibold text-gray-900">AI Task Suggestions</h3>
            {loadingSuggestions && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00BFA6]"></div>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Personalized task recommendations based on {member?.displayName || 'their'}'s role, 
            responsibilities, and company goals for this {timeframe}:
          </p>
          {aiSuggestions.length > 0 ? (
            <div className="space-y-2">
              {aiSuggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <FaLightbulb className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{suggestion}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              {loadingSuggestions ? 'Loading suggestions...' : 'No suggestions available'}
            </div>
          )}
        </div>

        {/* Active Goals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaBullseye className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Active Goals</h3>
          </div>
          {goals.length > 0 ? (
            <div className="space-y-3">
              {goals.slice(0, 5).map((goal) => (
                <div key={goal.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900 text-sm">{goal.title}</div>
                  {goal.progress !== undefined && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#00BFA6] h-2 rounded-full transition-all"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{goal.progress}% complete</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              No active goals assigned
            </div>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaTasks className="w-5 h-5 text-[#005C70]" />
            <h3 className="text-lg font-semibold text-gray-900">
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}ly Tasks
            </h3>
          </div>
          <div className="text-sm text-gray-500">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFA6] mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaTasks className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No {timeframe}ly tasks assigned yet</p>
            <p className="text-xs mt-1">Check AI suggestions above for recommendations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#00BFA6] transition-colors">
                <button className="flex-shrink-0 mt-0.5">
                  {task.status === 'completed' ? (
                    <FaCheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <FaCircle className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <FaCalendar className="w-3 h-3" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {task.estimatedHours && (
                      <div className="flex items-center gap-1">
                        <FaClock className="w-3 h-3" />
                        <span>{task.estimatedHours}h</span>
                      </div>
                    )}
                    {task.goalId && (
                      <div className="flex items-center gap-1">
                        <FaBullseye className="w-3 h-3" />
                        <span>Linked to goal</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonWorkspace;

