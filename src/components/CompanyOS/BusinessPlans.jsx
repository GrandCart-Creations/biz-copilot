/**
 * BUSINESS PLANS
 * 
 * Create, edit, and manage business plans
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaFileAlt, FaEdit, FaTrash, FaPlus, FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

const BusinessPlans = ({ onBack }) => {
  const { currentCompanyId, userRole } = useCompany();
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    executiveSummary: '',
    marketAnalysis: '',
    organization: '',
    products: '',
    marketing: '',
    financial: '',
    timeline: ''
  });

  const canEdit = ['owner', 'manager'].includes(userRole);

  useEffect(() => {
    if (currentCompanyId) {
      loadPlans();
    }
  }, [currentCompanyId]);

  const loadPlans = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    try {
      const plansRef = collection(db, 'companies', currentCompanyId, 'businessPlans');
      const q = query(plansRef, where('deleted', '!=', true));
      const snapshot = await getDocs(q);
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading business plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      title: '',
      description: '',
      executiveSummary: '',
      marketAnalysis: '',
      organization: '',
      products: '',
      marketing: '',
      financial: '',
      timeline: ''
    });
    setShowEditor(true);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      title: plan.title || '',
      description: plan.description || '',
      executiveSummary: plan.executiveSummary || '',
      marketAnalysis: plan.marketAnalysis || '',
      organization: plan.organization || '',
      products: plan.products || '',
      marketing: plan.marketing || '',
      financial: plan.financial || '',
      timeline: plan.timeline || ''
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      const planData = {
        ...formData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      let savedPlanId = null;

      if (editingPlan) {
        savedPlanId = editingPlan.id;
        const planRef = doc(db, 'companies', currentCompanyId, 'businessPlans', editingPlan.id);
        await updateDoc(planRef, planData);
      } else {
        planData.createdAt = serverTimestamp();
        planData.createdBy = currentUser.uid;
        planData.companyId = currentCompanyId;
        const plansRef = collection(db, 'companies', currentCompanyId, 'businessPlans');
        const newPlanRef = await addDoc(plansRef, planData);
        savedPlanId = newPlanRef.id;
      }
      
      await loadPlans();
      
      // Notify linked roadmaps that the plan has been updated
      if (savedPlanId) {
        await notifyLinkedRoadmaps(savedPlanId);
      }
      
      setShowEditor(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving business plan:', error);
      alert('Failed to save business plan. Please try again.');
    }
  };

  const notifyLinkedRoadmaps = async (planId) => {
    if (!currentCompanyId) return;
    
    try {
      // Find all roadmaps linked to this plan
      const roadmapsRef = collection(db, 'companies', currentCompanyId, 'roadmaps');
      const roadmapsSnapshot = await getDocs(query(roadmapsRef, where('businessPlanId', '==', planId), where('deleted', '!=', true)));
      
      // Mark them as needing sync
      const updatePromises = roadmapsSnapshot.docs.map(roadmapDoc => {
        return updateDoc(doc(db, 'companies', currentCompanyId, 'roadmaps', roadmapDoc.id), {
          alignedWithPlan: false,
          planUpdatedAt: serverTimestamp()
        });
      });
      
      await Promise.all(updatePromises);
      console.log(`[BusinessPlans] Notified ${updatePromises.length} linked roadmap(s) that plan was updated`);
    } catch (error) {
      console.error('Error notifying linked roadmaps:', error);
      // Don't fail the save if notification fails
    }
  };

  const handleDelete = async (planId) => {
    if (!confirm('Are you sure you want to delete this business plan?')) return;

    try {
      const planRef = doc(db, 'companies', currentCompanyId, 'businessPlans', planId);
      await updateDoc(planRef, {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      await loadPlans();
    } catch (error) {
      console.error('Error deleting business plan:', error);
      alert('Failed to delete business plan. Please try again.');
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
                setEditingPlan(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingPlan ? 'Edit Business Plan' : 'Create Business Plan'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingPlan(null);
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
              Save Plan
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
              placeholder="e.g., 2025 Business Plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Brief overview of this business plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Executive Summary</label>
            <textarea
              value={formData.executiveSummary}
              onChange={(e) => setFormData({ ...formData, executiveSummary: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="High-level overview of your business, mission, and key objectives"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Market Analysis</label>
            <textarea
              value={formData.marketAnalysis}
              onChange={(e) => setFormData({ ...formData, marketAnalysis: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Market research, target audience, competition analysis"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Organization & Management</label>
            <textarea
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Organizational structure, team, management approach"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Products & Services</label>
            <textarea
              value={formData.products}
              onChange={(e) => setFormData({ ...formData, products: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Description of products/services, pricing strategy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marketing & Sales</label>
            <textarea
              value={formData.marketing}
              onChange={(e) => setFormData({ ...formData, marketing: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Marketing strategy, sales approach, customer acquisition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Financial Projections</label>
            <textarea
              value={formData.financial}
              onChange={(e) => setFormData({ ...formData, financial: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Revenue projections, expenses, funding needs, financial milestones"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeline & Milestones</label>
            <textarea
              value={formData.timeline}
              onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
              placeholder="Key milestones, deadlines, implementation timeline"
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
            <h2 className="text-2xl font-bold text-gray-900">Business Plans</h2>
            <p className="text-sm text-gray-600">Create and manage strategic business plans</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            New Business Plan
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFA6] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FaFileAlt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Business Plans Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first business plan to outline your company's strategy and goals
          </p>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg hover:from-[#014A5A] hover:to-[#019884] transition-all"
            >
              Create Business Plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <FaFileAlt className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FaEdit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <FaTrash className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
              {plan.updatedAt && (
                <div className="text-xs text-gray-500">
                  Updated {plan.updatedAt.toDate ? new Date(plan.updatedAt.toDate()).toLocaleDateString() : 'Recently'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessPlans;

