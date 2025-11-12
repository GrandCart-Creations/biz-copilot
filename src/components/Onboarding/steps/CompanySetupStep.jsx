/**
 * COMPANY SETUP STEP
 * 
 * Step 2: Create or join a company
 */

import React, { useState } from 'react';
import { useCompany } from '../../../contexts/CompanyContext';
import { FaBuilding, FaUsers, FaPlus } from 'react-icons/fa';

const CompanySetupStep = ({ onNext, onPrevious }) => {
  const { companies, createCompany, loading } = useCompany();
  const [companyName, setCompanyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreateCompany = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setCreating(true);
    setError('');

    try {
      await createCompany(companyName.trim());
      // Company created, move to next step
      onNext({ companyCreated: true, companyName: companyName.trim() });
    } catch (err) {
      setError(err.message || 'Failed to create company');
      setCreating(false);
    }
  };

  const handleSkip = () => {
    // User already has a company, skip to next step
    onNext({ skipped: true });
  };

  const hasCompanies = companies && companies.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Set Up Your Company
        </h2>
        <p className="text-gray-600">
          Create your first company profile to get started. You can add more companies later.
        </p>
      </div>

      {hasCompanies ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
          <FaBuilding className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-900 mb-2">
            Company Already Created!
          </h3>
          <p className="text-gray-600 mb-6">
            You already have a company set up. You can proceed to the next step.
          </p>
          <button
            onClick={handleSkip}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Continue to Next Step →
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-[#D4F5EF] rounded-lg flex items-center justify-center flex-shrink-0">
                <FaBuilding className="w-6 h-6 text-[#005C70]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Create Your Company</h3>
                <p className="text-sm text-gray-600">
                  Give your company a name. This can be your business name or a project name.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g., GrandCart Creations"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFA6] focus:border-transparent"
                  autoFocus
                  disabled={creating}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              <button
                onClick={handleCreateCompany}
                disabled={creating || !companyName.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#005C70] to-[#00BFA6] text-white rounded-lg font-semibold hover:from-[#014A5A] hover:to-[#019884] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating Company...
                  </>
                ) : (
                  <>
                    <FaPlus className="w-5 h-5" />
                    Create Company
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FaUsers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can invite team members and create additional companies after setup.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySetupStep;

