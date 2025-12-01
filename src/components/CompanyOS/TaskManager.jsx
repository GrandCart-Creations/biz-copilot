/**
 * TASK MANAGER
 * 
 * Daily, weekly, monthly, and yearly task management
 * Integrated with AI Command Center for proactive task suggestions
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { processAIQuery } from '../../utils/aiEngine';
import { FaTasks, FaEdit, FaTrash, FaPlus, FaArrowLeft, FaSave, FaCheckCircle, FaCircle, FaRobot, FaLightbulb, FaCalendar, FaClock } from 'react-icons/fa';

const TaskManager = ({ onBack }) => {
  const { currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [timeframe, setTimeframe] = useState('week'); // 'day', 'week', 'month', 'year'
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalId: '',
    dueDate: '',
    timeframe: 'week',
    priority: 'medium',
    status: 'pending',
    estimatedHours: '',
    assignedTo: ''
  });

  const canEdit = ['owner', 'manager', 'employee'].includes(userRole);

  useEffect(() => {
    if (currentCompanyId) {
      loadData();
    }
  }, [currentCompanyId, timeframe]);

  useEffect(() => {
    if (currentCompanyId && currentUser) {
      loadAISuggestions();
    }
  }, [currentCompanyId, currentUser, timeframe]);

  const loadData = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    try {
      // Load tasks
      const tasksRef = collection(db, 'companies', currentCompanyId, 'tasks');
      const q = query(
        tasksRef,
        where('deleted', '!=', true),
        where('timeframe', '==', timeframe),
        orderBy('dueDate', 'asc')
      );
      const snapshot = await getDocs(q);
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksData);

      // Load goals for linking
      const goalsRef = collection(db, 'companies', currentCompanyId, 'goals');
      const goalsSnapshot = await getDocs(query(goalsRef, where('deleted', '!=', true), where('status', '==', 'active')));
      const goalsData = goalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGoals(goalsData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAISuggestions = async () => {
    if (!currentCompanyId || !currentUser) return;

    setLoadingSuggestions(true);
    try {
      // Use AI to generate proactive task suggestions based on goals, roadmaps, and company context
      const queryText = `Based on our company goals and roadmap, suggest ${timeframe}ly tasks for ${currentUser.displayName || 'the team'}. Focus on actionable items that drive progress toward our objectives.`;
      
      const response = await processAIQuery(queryText, 'global', currentCompanyId, currentUser.uid);
      
      if (response && response.suggestions) {
        // Parse AI suggestions into task format
        const suggestions = Array.isArray(response.suggestions) 
          ? response.suggestions 
          : response.suggestions.split('\n').filter(s => s.trim());
        
        setAiSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
      }
    } catch (error) {
      console.error('Error loading AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleCreate = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      goalId: '',
      dueDate: '',
      timeframe: timeframe,
      priority: 'medium',
      status: 'pending',
      estimatedHours: '',
      assignedTo: currentUser.uid
    });
    setShowEditor(true);
  };

  const handleCreateFromSuggestion = (suggestion) => {
    setEditingTask(null);
    setFormData({
      title: suggestion,
      description: `AI-suggested task for ${timeframe}ly goals`,
      goalId: '',
      dueDate: '',
      timeframe: timeframe,
      priority: 'medium',
      status: 'pending',
      estimatedHours: '',
      assignedTo: currentUser.uid
    });
    setShowEditor(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      goalId: task.goalId || '',
      dueDate: task.dueDate || '',
      timeframe: task.timeframe || timeframe,
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      estimatedHours: task.estimatedHours || '',
      assignedTo: task.assignedTo || currentUser.uid
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      const taskData = {
        ...formData,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editingTask) {
        const taskRef = doc(db, 'companies', currentCompanyId, 'tasks', editingTask.id);
        await updateDoc(taskRef, taskData);
      } else {
        taskData.createdAt = serverTimestamp();
        taskData.createdBy = currentUser.uid;
        taskData.companyId = currentCompanyId;
        const tasksRef = collection(db, 'companies', currentCompanyId, 'tasks');
        await addDoc(tasksRef, taskData);
      }

      await loadData();
      setShowEditor(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    }
  };

  const handleToggleStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const taskRef = doc(db, 'companies', currentCompanyId, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        completedAt: newStatus === 'completed' ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });
      await loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const taskRef = doc(db, 'companies', currentCompanyId, 'tasks', taskId);
      await updateDoc(taskRef, {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      await loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in-progress': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredTasks = tasks.filter(task => {
    // Additional filtering can be added here
    return true;
  });

  if (showEditor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingTask(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingTask ? 'Edit Task' : 'Create Task'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingTask(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
            >
              <FaSave className="w-4 h-4" />
              Save Task
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="e.g., Review Q1 financial reports"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Task details and requirements"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link to Goal</label>
              <select
                value={formData.goalId}
                onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              >
                <option value="">None</option>
                {goals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
              <select
                value={formData.timeframe}
                onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Task Manager</h2>
            <p className="text-sm text-gray-600">Manage daily, weekly, monthly, and yearly tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          {canEdit && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
            >
              <FaPlus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-[#F0FBF8] to-[#EAF4F6] rounded-lg p-6 border border-[#B8E5DC]">
          <div className="flex items-center gap-3 mb-4">
            <FaRobot className="w-6 h-6 text-[#005C70]" />
            <h3 className="text-lg font-semibold text-gray-900">AI Task Suggestions</h3>
            {loadingSuggestions && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00BFA6]"></div>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Based on your goals and roadmap, here are some suggested tasks for this {timeframe}:
          </p>
          <div className="space-y-2">
            {aiSuggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <FaLightbulb className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-gray-700">{suggestion}</span>
                </div>
                <button
                  onClick={() => handleCreateFromSuggestion(suggestion)}
                  className="px-3 py-1 text-xs bg-[#005C70] text-white rounded hover:bg-[#014A5A] transition-colors"
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FaTasks className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No {timeframe}ly Tasks Yet</h3>
          <p className="text-gray-600 mb-6">
            Create tasks or use AI suggestions to get started with your {timeframe}ly planning
          </p>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all"
            >
              Create Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const goal = goals.find(g => g.id === task.goalId);
            return (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => handleToggleStatus(task.id, task.status)}
                        className="flex-shrink-0"
                      >
                        {task.status === 'completed' ? (
                          <FaCheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <FaCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <h3 className={`text-lg font-semibold ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-gray-600 mb-3 ml-8">{task.description}</p>
                    )}
                    {goal && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 ml-8 mb-2">
                        <FaBullseye className="w-4 h-4" />
                        <span>Linked to goal: {goal.title}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 ml-8">
                      {task.dueDate && (
                        <div className="flex items-center gap-2">
                          <FaCalendar className="w-4 h-4" />
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.estimatedHours && (
                        <div className="flex items-center gap-2">
                          <FaClock className="w-4 h-4" />
                          <span>{task.estimatedHours}h estimated</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(task)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FaEdit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FaTrash className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskManager;

