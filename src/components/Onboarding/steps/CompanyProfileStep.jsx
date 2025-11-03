/**
 * COMPANY PROFILE STEP
 * 
 * Step 3: Set up company profile (country, currency, tax rates)
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../../../contexts/CompanyContext';
import { FaFlag, FaCoins, FaPercentage } from 'react-icons/fa';

const BENELUX_COUNTRIES = [
  { code: 'NL', name: 'Netherlands', currency: 'EUR', taxRates: [0, 9, 21] },
  { code: 'BE', name: 'Belgium', currency: 'EUR', taxRates: [0, 6, 12, 21] },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR', taxRates: [0, 3, 8, 17] }
];

const CompanyProfileStep = ({ onNext, onPrevious }) => {
  const { currentCompany, updateCompanyName } = useCompany();
  const [country, setCountry] = useState('NL');
  const [currency, setCurrency] = useState('EUR');
  const [saving, setSaving] = useState(false);

  const selectedCountry = BENELUX_COUNTRIES.find(c => c.code === country);

  useEffect(() => {
    if (currentCompany?.settings) {
      const settings = currentCompany.settings;
      setCountry(settings.country || 'NL');
      setCurrency(settings.currency || 'EUR');
    }
  }, [currentCompany]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save settings - proceed to next step
      // Settings will be applied when company is created or can be updated later in Settings
      onNext({
        country,
        currency,
        taxRates: selectedCountry?.taxRates || [0, 9, 21],
        settingsUpdated: true
      });
    } catch (error) {
      console.error('Error saving company profile:', error);
      setSaving(false);
    }
  };

  const handleContinue = () => {
    onNext({
      country,
      currency,
      taxRates: selectedCountry?.taxRates || [0, 9, 21],
      settingsUpdated: false
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Company Profile
        </h2>
        <p className="text-gray-600">
          Configure your regional settings and tax preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Country Selection */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FaFlag className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Country *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {BENELUX_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountry(c.code);
                      setCurrency(c.currency);
                    }}
                    className={`px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                      country === c.code
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Currency Display */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FaCoins className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Currency
              </label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-lg font-semibold text-gray-900">{currency}</span>
                <span className="text-sm text-gray-500 ml-2">
                  (Automatically set based on country)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Rates Display */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FaPercentage className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                VAT/Tax Rates
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedCountry?.taxRates.map((rate) => (
                  <span
                    key={rate}
                    className="px-3 py-1 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 font-medium"
                  >
                    {rate}%
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                These rates will be used for automatic calculations in your expenses and invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> You can change these settings later in Company Settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileStep;

