/**
 * COMPANY BRANDING MANAGEMENT
 * 
 * Allows company owners to customize branding for login/signup pages
 */

import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  getCompanyBranding, 
  updateCompanyBranding, 
  uploadCompanyLogo, 
  deleteCompanyLogo 
} from '../firebase';
import { DEFAULT_INVOICE_TEMPLATE } from '../utils/invoiceTemplate';
import { FaImage, FaTrash, FaSave, FaUpload, FaSpinner, FaCheckCircle, FaExclamationCircle, FaFileInvoice, FaPalette } from 'react-icons/fa';

const CompanyBranding = () => {
  const { currentCompanyId, userRole } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [branding, setBranding] = useState({
    logoUrl: '',
    logoPath: '',
    primaryColor: '#005C70', // Primary brand blue
    tagline: '',
    companyName: '',
    aboutCompany: '',
    invoiceTemplate: { ...DEFAULT_INVOICE_TEMPLATE }
  });
  
  const [showInvoiceTemplate, setShowInvoiceTemplate] = useState(false);

  // Load existing branding
  useEffect(() => {
    loadBranding();
  }, [currentCompanyId]);

  const loadBranding = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const companyData = await getCompanyBranding(currentCompanyId);
      
      if (companyData?.branding) {
        setBranding({
          logoUrl: companyData.branding.logoUrl || '',
          logoPath: companyData.branding.logoPath || '',
          primaryColor: companyData.branding.primaryColor || '#005C70',
          tagline: companyData.branding.tagline || '',
          companyName: companyData.name || '',
          aboutCompany: companyData.branding.aboutCompany || '',
          invoiceTemplate: companyData.branding.invoiceTemplate || { ...DEFAULT_INVOICE_TEMPLATE }
        });
      } else {
        // Initialize with company name if no branding exists
        setBranding(prev => ({
          ...prev,
          companyName: companyData?.name || ''
        }));
      }
    } catch (err) {
      console.error('Error loading branding:', err);
      setError('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Upload logo
      const uploadResult = await uploadCompanyLogo(
        currentCompanyId, 
        file, 
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      );

      // Delete old logo if exists
      if (branding.logoPath) {
        try {
          await deleteCompanyLogo(branding.logoPath);
        } catch (err) {
          console.warn('Failed to delete old logo:', err);
          // Continue anyway
        }
      }

      // Update branding state
      setBranding(prev => ({
        ...prev,
        logoUrl: uploadResult.fileUrl,
        logoPath: uploadResult.filePath
      }));

      setSuccess('Logo uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!branding.logoPath) return;

    if (!window.confirm('Are you sure you want to delete the logo?')) {
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      await deleteCompanyLogo(branding.logoPath);
      
      setBranding(prev => ({
        ...prev,
        logoUrl: '',
        logoPath: ''
      }));

      setSuccess('Logo deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting logo:', err);
      setError(err.message || 'Failed to delete logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentCompanyId) {
      setError('No company selected. Please select a company first.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const brandingData = {
        logoUrl: branding.logoUrl,
        logoPath: branding.logoPath,
        primaryColor: branding.primaryColor,
        tagline: branding.tagline.trim(),
        aboutCompany: branding.aboutCompany.trim(),
        invoiceTemplate: branding.invoiceTemplate || { ...DEFAULT_INVOICE_TEMPLATE }
      };

      console.log('Saving branding data:', brandingData);
      await updateCompanyBranding(currentCompanyId, brandingData);
      
      console.log('Branding saved successfully!');
      setSuccess('✅ Branding settings saved successfully! Your changes will appear on login/signup pages.');
      
      // Clear success message after 5 seconds (longer for better visibility)
      setTimeout(() => {
        setSuccess('');
      }, 5000);
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saving branding:', err);
      setError(err.message || 'Failed to save branding settings. Please try again.');
      
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  // Only owners can access branding
  if (userRole !== 'owner') {
    return (
      <div className="text-center py-12">
        <FaExclamationCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">Only company owners can manage branding settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Company Branding</h2>
        <p className="text-sm text-gray-600">
          Customize your company's branding for login and signup pages. This will be visible to all team members and invited users.
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg flex items-center gap-3 mb-6 shadow-sm">
          <FaCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-center gap-3 mb-6 shadow-sm">
          <FaExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Logo Upload Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload your company logo (PNG, JPG, or SVG). Max size: 2 MB. Recommended: 200x200px or larger.
        </p>

        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            {branding.logoUrl ? (
              <div className="relative">
                <img
                  src={branding.logoUrl}
                  alt="Company Logo"
                  className="w-32 h-32 object-contain border border-gray-200 rounded-lg bg-white p-2"
                />
                {branding.logoPath && (
                  <button
                    onClick={handleDeleteLogo}
                    disabled={uploading}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
                    title="Delete logo"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <FaImage className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <label className="block">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => document.querySelector('input[type="file"]')?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaUpload className="w-4 h-4" />
                      {branding.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                    </>
                  )}
                </button>
                {branding.logoUrl && (
                  <span className="text-sm text-gray-600">
                    Logo will be displayed on login and signup pages
                  </span>
                )}
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Brand Color Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Color</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose your primary brand color. This will be used for buttons and accents on login/signup pages.
        </p>

        <div className="flex items-center gap-4">
          <input
            type="color"
            value={branding.primaryColor}
            onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
            className="w-20 h-12 border border-gray-300 rounded-lg cursor-pointer"
          />
          <div className="flex-1">
            <input
              type="text"
              value={branding.primaryColor}
              onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
              placeholder="#005C70"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a hex color code (e.g., #005C70)
            </p>
          </div>
          <div
            className="w-16 h-12 rounded-lg border border-gray-300"
            style={{ backgroundColor: branding.primaryColor }}
          />
        </div>
      </div>

      {/* Tagline Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tagline (Optional)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add a custom tagline that will appear on your login/signup pages.
        </p>

        <input
          type="text"
          value={branding.tagline}
          onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
          placeholder="e.g., Your Business Co-Pilot, Every Step of the Way"
          maxLength={100}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          {branding.tagline.length}/100 characters
        </p>
      </div>

      {/* About Company Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About This Company</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add a description about your company. This will appear on invitation pages and login/signup pages instead of generic text.
        </p>

        <textarea
          value={branding.aboutCompany}
          onChange={(e) => setBranding(prev => ({ ...prev, aboutCompany: e.target.value }))}
          placeholder="e.g., GrandCart Creations is a leading software development company specializing in creating innovative business solutions for BENELUX entrepreneurs..."
          rows={4}
          maxLength={500}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {branding.aboutCompany.length}/500 characters
        </p>
      </div>

      {/* Invoice Template Customization Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FaFileInvoice className="text-purple-600" />
              Invoice & Receipt Template
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Customize the appearance of your invoices and receipts. These settings apply to both PDF documents and on-screen views.
            </p>
          </div>
          <button
            onClick={() => setShowInvoiceTemplate(!showInvoiceTemplate)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FaPalette />
            {showInvoiceTemplate ? 'Hide' : 'Customize'}
          </button>
        </div>

        {showInvoiceTemplate && (
          <div className="mt-6 space-y-6 border-t border-gray-200 pt-6">
            {/* Header Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Style
              </label>
              <select
                value={branding.invoiceTemplate?.headerStyle || 'minimal'}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  invoiceTemplate: {
                    ...prev.invoiceTemplate,
                    headerStyle: e.target.value
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                style={{ color: '#111827' }}
              >
                <option value="minimal" style={{ color: '#111827' }}>Minimal (Clean White - Default)</option>
                <option value="colored" style={{ color: '#111827' }}>Colored Header</option>
                <option value="none" style={{ color: '#111827' }}>No Header</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Minimal style uses a clean white background matching your screenshot design
              </p>
            </div>

            {/* Black & White Mode */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Black & White Mode
                </label>
                <p className="text-xs text-gray-600">
                  Convert all colors to grayscale for printing or professional documents
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.invoiceTemplate?.blackAndWhite || false}
                  onChange={(e) => setBranding(prev => ({
                    ...prev,
                    invoiceTemplate: {
                      ...prev.invoiceTemplate,
                      blackAndWhite: e.target.checked
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Logo Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Show Logo
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={branding.invoiceTemplate?.showLogo !== false}
                    onChange={(e) => setBranding(prev => ({
                      ...prev,
                      invoiceTemplate: {
                        ...prev.invoiceTemplate,
                        showLogo: e.target.checked
                      }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo Size (pixels)
                </label>
                <input
                  type="number"
                  min="20"
                  max="100"
                  value={branding.invoiceTemplate?.logoSize || 40}
                  onChange={(e) => setBranding(prev => ({
                    ...prev,
                    invoiceTemplate: {
                      ...prev.invoiceTemplate,
                      logoSize: parseInt(e.target.value) || 40
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  style={{ color: '#111827' }}
                />
              </div>
            </div>

            {/* Section Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Show Sections
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'showCompanyDetails', label: 'Company Details' },
                  { key: 'showCustomerDetails', label: 'Customer Details' },
                  { key: 'showDates', label: 'Dates' },
                  { key: 'showLineItems', label: 'Line Items' },
                  { key: 'showTotals', label: 'Totals' },
                  { key: 'showPaymentInfo', label: 'Payment Info' },
                  { key: 'showNotes', label: 'Notes' },
                  { key: 'showFooter', label: 'Footer' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={branding.invoiceTemplate?.[key] !== false}
                      onChange={(e) => setBranding(prev => ({
                        ...prev,
                        invoiceTemplate: {
                          ...prev.invoiceTemplate,
                          [key]: e.target.checked
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Color Customization (only if not B&W) */}
            {!branding.invoiceTemplate?.blackAndWhite && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Color Customization</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Primary Color (for accents)
                    </label>
                    <input
                      type="color"
                      value={branding.invoiceTemplate?.primaryColor || branding.primaryColor || '#4F46E5'}
                      onChange={(e) => setBranding(prev => ({
                        ...prev,
                        invoiceTemplate: {
                          ...prev.invoiceTemplate,
                          primaryColor: e.target.value
                        }
                      }))}
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={branding.invoiceTemplate?.textColor || '#111827'}
                      onChange={(e) => setBranding(prev => ({
                        ...prev,
                        invoiceTemplate: {
                          ...prev.invoiceTemplate,
                          textColor: e.target.value
                        }
                      }))}
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reset to Default */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => {
                  setBranding(prev => ({
                    ...prev,
                    invoiceTemplate: { ...DEFAULT_INVOICE_TEMPLATE }
                  }));
                }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset to Default Template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
        <p className="text-sm text-gray-600 mb-4">
          This is how your branding will appear on login/signup pages:
        </p>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Company Logo"
                className="w-10 h-10 object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-xs font-bold">LOGO</span>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-gray-900">{branding.companyName || 'Your Company'}</h4>
              {branding.tagline && (
                <p className="text-sm text-gray-600">{branding.tagline}</p>
              )}
            </div>
          </div>
          <button
            className="px-6 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FaSave className="w-4 h-4" />
              Save Branding Settings
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FaExclamationCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Branded Login URLs</p>
            <p className="mb-2">
              Once saved, you can share branded login/signup URLs with your team:
            </p>
            <code className="bg-blue-100 px-2 py-1 rounded text-xs">
              {window.location.origin}/login?company={currentCompanyId}
            </code>
            <p className="mt-2 text-xs">
              Invitation emails will automatically include these branded URLs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyBranding;

