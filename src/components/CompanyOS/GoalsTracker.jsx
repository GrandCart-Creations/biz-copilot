/**
 * GOALS TRACKER
 * 
 * Set and track goals aligned with roadmaps
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaBullseye, FaEdit, FaTrash, FaPlus, FaArrowLeft, FaSave, FaCheckCircle, FaCircle, FaRoute } from 'react-icons/fa';

const GoalsTracker = ({ onBack }) => {
  const { currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    roadmapId: '',
    targetDate: '',
    status: 'active', // 'active', 'completed', 'paused'
    priority: 'medium', // 'low', 'medium', 'high'
    metrics: '',
    progress: 0
  });

  const canEdit = ['owner', 'manager'].includes(userRole);

  useEffect(() => {
    if (currentCompanyId) {
      loadData();
    }
  }, [currentCompanyId]);

  const loadData = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    try {
      // Load goals
      const goalsRef = collection(db, 'companies', currentCompanyId, 'goals');
      const q = query(goalsRef, where('deleted', '!=', true));
      const snapshot = await getDocs(q);
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGoals(goalsData);

      // Load roadmaps for linking
      const roadmapsRef = collection(db, 'companies', currentCompanyId, 'roadmaps');
      const roadmapsSnapshot = await getDocs(query(roadmapsRef, where('deleted', '!=', true)));
      const roadmapsData = roadmapsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRoadmaps(roadmapsData);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGoal(null);
    setFormData({
      title: '',
      description: '',
      roadmapId: '',
      targetDate: '',
      status: 'active',
      priority: 'medium',
      metrics: '',
      progress: 0
    });
    setShowEditor(true);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title || '',
      description: goal.description || '',
      roadmapId: goal.roadmapId || '',
      targetDate: goal.targetDate || '',
      status: goal.status || 'active',
      priority: goal.priority || 'medium',
      metrics: goal.metrics || '',
      progress: goal.progress || 0
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      const goalData = {
        ...formData,
        progress: parseInt(formData.progress) || 0,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editingGoal) {
        const goalRef = doc(db, 'companies', currentCompanyId, 'goals', editingGoal.id);
        await updateDoc(goalRef, goalData);
      } else {
        goalData.createdAt = serverTimestamp();
        goalData.createdBy = currentUser.uid;
        goalData.companyId = currentCompanyId;
        const goalsRef = collection(db, 'companies', currentCompanyId, 'goals');
        await addDoc(goalsRef, goalData);
      }

      await loadData();
      setShowEditor(false);
      setEditingGoal(null);
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal. Please try again.');
    }
  };

  const handleToggleStatus = async (goalId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    try {
      const goalRef = doc(db, 'companies', currentCompanyId, 'goals', goalId);
      await updateDoc(goalRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      await loadData();
    } catch (error) {
      console.error('Error updating goal status:', error);
    }
  };

  const handleDelete = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const goalRef = doc(db, 'companies', currentCompanyId, 'goals', goalId);
      await updateDoc(goalRef, {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      await loadData();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (filter === 'all') return true;
    return goal.status === filter;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (showEditor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingGoal(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingGoal ? 'Edit Goal' : 'Create Goal'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingGoal(null);
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
              Save Goal
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
              placeholder="e.g., Increase revenue by 50%"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Detailed description of this goal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link to Roadmap</label>
              <select
                value={formData.roadmapId}
                onChange={(e) => setFormData({ ...formData, roadmapId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              >
                <option value="">None</option>
                {roadmaps.map(roadmap => (
                  <option key={roadmap.id} value={roadmap.id}>{roadmap.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Success Metrics</label>
            <textarea
              value={formData.metrics}
              onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="How will you measure success? (e.g., Revenue: €100K, Users: 10K)"
            />
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
            <h2 className="text-2xl font-bold text-gray-900">Goals</h2>
            <p className="text-sm text-gray-600">Set and track strategic goals aligned with roadmaps</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === 'all' ? 'bg-[#005C70] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === 'active' ? 'bg-[#005C70] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === 'completed' ? 'bg-[#005C70] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Completed
            </button>
          </div>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
            >
              <FaPlus className="w-4 h-4" />
              New Goal
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading goals...</p>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FaBullseye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goals Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first goal to start tracking progress toward your roadmap objectives
          </p>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all"
            >
              Create Goal
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => {
            const roadmap = roadmaps.find(r => r.id === goal.roadmapId);
            return (
              <div key={goal.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => handleToggleStatus(goal.id, goal.status)}
                        className="flex-shrink-0"
                      >
                        {goal.status === 'completed' ? (
                          <FaCheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <FaCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <h3 className={`text-lg font-semibold ${goal.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {goal.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                        {goal.priority}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-gray-600 mb-3 ml-8">{goal.description}</p>
                    )}
                    {roadmap && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 ml-8 mb-2">
                        <FaRoute className="w-4 h-4" />
                        <span>Linked to: {roadmap.title}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 ml-8">
                      {goal.targetDate && (
                        <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      )}
                      {goal.progress !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[#00BFA6] h-2 rounded-full transition-all"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <span>{goal.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(goal)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FaEdit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FaTrash className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
                {goal.metrics && (
                  <div className="mt-4 pt-4 border-t border-gray-200 ml-8">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Metrics: </span>
                      <span className="text-gray-600">{goal.metrics}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalsTracker;

