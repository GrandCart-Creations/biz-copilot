/**
 * ROADMAPS
 * 
 * Create and manage company roadmaps with timeline visualization
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaRoute, FaEdit, FaTrash, FaPlus, FaArrowLeft, FaSave, FaCalendar, FaFlag, FaFileAlt, FaSync } from 'react-icons/fa';

const Roadmaps = ({ onBack }) => {
  const { currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  const [roadmaps, setRoadmaps] = useState([]);
  const [businessPlans, setBusinessPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRoadmap, setEditingRoadmap] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    businessPlanId: '', // Link to Master Plan
    startDate: '',
    endDate: '',
    milestones: [],
    vision: '',
    objectives: '',
    alignedWithPlan: true
  });
  const [newMilestone, setNewMilestone] = useState({ name: '', date: '', description: '' });

  const canEdit = ['owner', 'manager'].includes(userRole);

  useEffect(() => {
    if (currentCompanyId) {
      loadRoadmaps();
    }
  }, [currentCompanyId]);

  const loadRoadmaps = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    try {
      // Load roadmaps
      const roadmapsRef = collection(db, 'companies', currentCompanyId, 'roadmaps');
      const q = query(roadmapsRef, where('deleted', '!=', true));
      const snapshot = await getDocs(q);
      const roadmapsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRoadmaps(roadmapsData);

      // Load business plans for linking
      const plansRef = collection(db, 'companies', currentCompanyId, 'businessPlans');
      const plansSnapshot = await getDocs(query(plansRef, where('deleted', '!=', true)));
      const plansData = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by updatedAt to get the most recent/active plan first
      plansData.sort((a, b) => {
        const aTime = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      setBusinessPlans(plansData);
    } catch (error) {
      console.error('Error loading roadmaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRoadmap(null);
    // Auto-link to the most recent business plan if available
    const masterPlan = businessPlans.length > 0 ? businessPlans[0] : null;
    setFormData({
      title: '',
      description: '',
      businessPlanId: masterPlan?.id || '',
      startDate: '',
      endDate: '',
      milestones: [],
      vision: masterPlan?.vision || '',
      objectives: masterPlan?.objectives || '',
      alignedWithPlan: !!masterPlan
    });
    setNewMilestone({ name: '', date: '', description: '' });
    setShowEditor(true);
  };

  const handleEdit = (roadmap) => {
    setEditingRoadmap(roadmap);
    setFormData({
      title: roadmap.title || '',
      description: roadmap.description || '',
      businessPlanId: roadmap.businessPlanId || '',
      startDate: roadmap.startDate || '',
      endDate: roadmap.endDate || '',
      milestones: roadmap.milestones || [],
      vision: roadmap.vision || '',
      objectives: roadmap.objectives || '',
      alignedWithPlan: roadmap.alignedWithPlan !== false
    });
    setNewMilestone({ name: '', date: '', description: '' });
    setShowEditor(true);
  };

  const addMilestone = () => {
    if (!newMilestone.name.trim() || !newMilestone.date) {
      alert('Please enter milestone name and date');
      return;
    }
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { ...newMilestone, id: Date.now().toString() }]
    });
    setNewMilestone({ name: '', date: '', description: '' });
  };

  const removeMilestone = (milestoneId) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter(m => m.id !== milestoneId)
    });
  };

  const handleSyncWithPlan = async () => {
    if (!formData.businessPlanId) {
      alert('Please select a Business Plan to sync with');
      return;
    }

    const selectedPlan = businessPlans.find(p => p.id === formData.businessPlanId);
    if (!selectedPlan) {
      alert('Selected Business Plan not found');
      return;
    }

    // Update roadmap with plan data
    setFormData({
      ...formData,
      vision: selectedPlan.executiveSummary || selectedPlan.vision || formData.vision,
      objectives: selectedPlan.objectives || formData.objectives,
      alignedWithPlan: true
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      const roadmapData = {
        ...formData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
        lastSyncedWithPlan: formData.alignedWithPlan ? serverTimestamp() : null
      };

      if (editingRoadmap) {
        const roadmapRef = doc(db, 'companies', currentCompanyId, 'roadmaps', editingRoadmap.id);
        await updateDoc(roadmapRef, roadmapData);
      } else {
        roadmapData.createdAt = serverTimestamp();
        roadmapData.createdBy = currentUser.uid;
        roadmapData.companyId = currentCompanyId;
        const roadmapsRef = collection(db, 'companies', currentCompanyId, 'roadmaps');
        await addDoc(roadmapsRef, roadmapData);
      }

      await loadRoadmaps();
      setShowEditor(false);
      setEditingRoadmap(null);
    } catch (error) {
      console.error('Error saving roadmap:', error);
      alert('Failed to save roadmap. Please try again.');
    }
  };

  const handleDelete = async (roadmapId) => {
    if (!confirm('Are you sure you want to delete this roadmap?')) return;

    try {
      const roadmapRef = doc(db, 'companies', currentCompanyId, 'roadmaps', roadmapId);
      await updateDoc(roadmapRef, {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      await loadRoadmaps();
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      alert('Failed to delete roadmap. Please try again.');
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
                setEditingRoadmap(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingRoadmap ? 'Edit Roadmap' : 'Create Roadmap'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingRoadmap(null);
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
              Save Roadmap
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
              placeholder="e.g., 2025 Product Roadmap"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Brief description of this roadmap"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <FaFileAlt className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Master Plan (Business Plan) *
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={formData.businessPlanId}
                    onChange={(e) => {
                      const planId = e.target.value;
                      const selectedPlan = businessPlans.find(p => p.id === planId);
                      setFormData({
                        ...formData,
                        businessPlanId: planId,
                        vision: selectedPlan?.executiveSummary || formData.vision,
                        objectives: selectedPlan?.objectives || formData.objectives,
                        alignedWithPlan: !!planId
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Select a Business Plan...</option>
                    {businessPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.title} {plan.updatedAt ? `(Updated ${new Date(plan.updatedAt.toDate?.() || plan.updatedAt).toLocaleDateString()})` : ''}
                      </option>
                    ))}
                  </select>
                  {formData.businessPlanId && (
                    <button
                      type="button"
                      onClick={handleSyncWithPlan}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                      title="Sync roadmap with selected Business Plan"
                    >
                      <FaSync className="w-4 h-4" />
                      Sync Now
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  <strong>Important:</strong> Roadmaps must be linked to your Company's Master Plan (Business Plan). 
                  When the plan is updated, use "Sync Now" to keep the roadmap aligned. The vision and objectives 
                  will automatically update from the plan.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vision</label>
            <textarea
              value={formData.vision}
              onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Where do you want your company to be? What's the long-term vision?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Key Objectives</label>
            <textarea
              value={formData.objectives}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Main objectives and goals for this roadmap"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Milestones</label>
            <div className="space-y-3 mb-4">
              {formData.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FaFlag className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{milestone.name}</div>
                    <div className="text-sm text-gray-600">{milestone.date}</div>
                    {milestone.description && (
                      <div className="text-sm text-gray-500 mt-1">{milestone.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeMilestone(milestone.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FaTrash className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newMilestone.name}
                onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                placeholder="Milestone name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              />
              <input
                type="date"
                value={newMilestone.date}
                onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              />
              <button
                onClick={addMilestone}
                className="px-4 py-2 bg-[#005C70] text-white rounded-lg hover:bg-[#014A5A] transition-colors"
              >
                Add
              </button>
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
            <h2 className="text-2xl font-bold text-gray-900">Roadmaps</h2>
            <p className="text-sm text-gray-600">Plan your company's future direction</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            New Roadmap
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roadmaps...</p>
        </div>
      ) : roadmaps.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FaRoute className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Roadmaps Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first roadmap to plan your company's strategic direction
          </p>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all"
            >
              Create Roadmap
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {roadmaps.map((roadmap) => (
            <div key={roadmap.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <FaRoute className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-xl font-semibold text-gray-900">{roadmap.title}</h3>
                    {roadmap.businessPlanId && (() => {
                      const linkedPlan = businessPlans.find(p => p.id === roadmap.businessPlanId);
                      return (
                        <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
                          <FaFileAlt className="w-3 h-3" />
                          <span>Linked to: {linkedPlan?.title || 'Master Plan'}</span>
                          {roadmap.alignedWithPlan ? (
                            <span className="flex items-center gap-1 text-green-600 ml-2">
                              <FaSync className="w-3 h-3" />
                              Aligned
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600 ml-2">
                              <FaSync className="w-3 h-3" />
                              Needs Sync
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  {roadmap.description && (
                    <p className="text-gray-600 mb-3">{roadmap.description}</p>
                  )}
                  {(roadmap.startDate || roadmap.endDate) && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {roadmap.startDate && (
                        <div className="flex items-center gap-2">
                          <FaCalendar className="w-4 h-4" />
                          <span>Start: {new Date(roadmap.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {roadmap.endDate && (
                        <div className="flex items-center gap-2">
                          <FaCalendar className="w-4 h-4" />
                          <span>End: {new Date(roadmap.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(roadmap)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FaEdit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(roadmap.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <FaTrash className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
              {roadmap.milestones && roadmap.milestones.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Milestones</h4>
                  <div className="space-y-2">
                    {roadmap.milestones.map((milestone, idx) => (
                      <div key={milestone.id || idx} className="flex items-center gap-3 text-sm">
                        <FaFlag className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{milestone.name}</span>
                        {milestone.date && (
                          <span className="text-gray-500">- {new Date(milestone.date).toLocaleDateString()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Roadmaps;

