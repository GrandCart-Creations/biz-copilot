// src/components/ExpenseTracker.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import parseExpensesWithExcelJS from '../utils/importers/exceljsExpenseParser';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {
  FaPlusCircle,
  FaChevronDown,
  FaChartLine,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTimes,
  FaPaperclip,
  FaDownload,
  FaFileAlt,
  FaUpload,
  FaFileExcel,
  FaFilePdf,
  FaImage,
  FaSearchPlus,
  FaSearchMinus,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaReceipt,
  FaFileInvoiceDollar,
  FaCreditCard,
  FaLink,
  FaHistory,
  FaSyncAlt,
  FaClipboardCheck,
  FaClock,
  FaCalendarCheck,
  FaTimesCircle,
  FaBell
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import CompanySelector from './CompanySelector';
import NotificationCenter from './NotificationCenter';
import ModuleNavigationButton from './ModuleNavigationButton';
import FinancialAccountSelect from './FinancialAccountSelect';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyExpenses,
  addCompanyExpense,
  updateCompanyExpense,
  deleteCompanyExpense,
  uploadExpenseFile,
  validateVatNumber,
  getUserProfile,
  subscribeToCompanyVendors,
  upsertCompanyVendorProfile,
  getCompanyFinancialAccounts,
  getCompanyContracts,
  getCompanyMembers
} from '../firebase';
import { trackEvent } from '../utils/analytics';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
const DEFAULT_ZOOM = 1.5;

const BASE_CURRENCY = 'EUR';

const EU_COUNTRY_OPTIONS = [
  { code: 'BE', label: 'Belgium' },
  { code: 'BG', label: 'Bulgaria' },
  { code: 'CZ', label: 'Czech Republic' },
  { code: 'DK', label: 'Denmark' },
  { code: 'DE', label: 'Germany' },
  { code: 'EE', label: 'Estonia' },
  { code: 'IE', label: 'Ireland' },
  { code: 'EL', label: 'Greece' },
  { code: 'ES', label: 'Spain' },
  { code: 'FR', label: 'France' },
  { code: 'HR', label: 'Croatia' },
  { code: 'IT', label: 'Italy' },
  { code: 'CY', label: 'Cyprus' },
  { code: 'LV', label: 'Latvia' },
  { code: 'LT', label: 'Lithuania' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'HU', label: 'Hungary' },
  { code: 'MT', label: 'Malta' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'AT', label: 'Austria' },
  { code: 'PL', label: 'Poland' },
  { code: 'PT', label: 'Portugal' },
  { code: 'RO', label: 'Romania' },
  { code: 'SI', label: 'Slovenia' },
  { code: 'SK', label: 'Slovakia' },
  { code: 'FI', label: 'Finland' },
  { code: 'SE', label: 'Sweden' }
];

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'SEK'];
const ADD_DOCUMENT_ONBOARDING_KEY = 'expense_tracker_add_document_onboarding_v1';
const ADD_EXPENSE_FORM_ID = 'add-expense-form';

const getFileSignature = (file) => `${file.name}-${file.size}-${file.lastModified}`;

const AttachmentPanel = ({
  selectedFiles,
  onFilesChange,
  previewItems,
  existingAttachments,
  onExistingAttachmentsChange,
  currentPreviewId,
  setCurrentPreviewId,
  zoomLevel,
  setZoomLevel,
  notesValue,
  onNotesChange,
  documentType,
  onDocumentTypeChange,
  paymentStatus,
  onPaymentStatusChange,
  autoFillStatus,
  autoFillMessage,
  autoFillProgress,
  className = ''
}) => {
  const [showOptions, setShowOptions] = useState(() => previewItems.length === 0);
  const currentPreview = useMemo(() => (
    previewItems.find(item => item.id === currentPreviewId) || null
  ), [previewItems, currentPreviewId]);

  const hasPreview = Boolean(currentPreview);
  const previewContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const MAX_ATTACHMENTS = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  const availableSlots = Math.max(0, MAX_ATTACHMENTS - selectedFiles.length);

  const addFiles = (files) => {
    if (!files.length) return;

    const currentSignatures = new Set(selectedFiles.map(getFileSignature));
    const accepted = [];
    const rejected = [];

    for (const file of files) {
      if (accepted.length >= availableSlots) break;

      if (!allowedMimeTypes.includes(file.type)) {
        rejected.push(`${file.name} (unsupported type)`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} (exceeds 10 MB)`);
        continue;
      }

      const signature = getFileSignature(file);
      if (currentSignatures.has(signature)) {
        continue;
      }
      currentSignatures.add(signature);
      accepted.push(file);
    }

    if (accepted.length > 0) {
      onFilesChange([...selectedFiles, ...accepted]);
    }

    if (rejected.length > 0) {
      alert(`Some files could not be added:\n${rejected.join('\n')}`);
    }
  };

  const handleFileInputChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    addFiles(files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []);
    addFiles(files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleManualUploadClick = () => {
    if (availableSlots <= 0) {
      alert('You can attach up to 5 files. Remove a file to add more.');
      return;
    }
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (hasPreview && previewContainerRef.current) {
      previewContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasPreview, currentPreviewId]);

  useEffect(() => {
    if (previewItems.length === 0) {
      setShowOptions(true);
    }
  }, [previewItems]);

  const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel));

  const documentTypeLabelMap = {
    invoice: 'Invoice',
    receipt: 'Receipt',
    statement: 'Bank Statement',
    other: 'Other Document'
  };

  const documentTypeLabel = documentTypeLabelMap[documentType] || 'Document';
  const paymentStatusLabel = paymentStatus
    ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)
    : 'Status';
  const optionsAreVisible = showOptions ? showOptions : true;

  const adjustZoom = (delta) => {
    setZoomLevel(prev => {
      const next = parseFloat((prev + delta).toFixed(2));
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  };

  const handleZoomSlider = (value) => {
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isNaN(parsed)) {
      setZoomLevel(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parsed)));
    }
  };

  const openInNewTab = () => {
    if (currentPreview?.url) {
      window.open(currentPreview.url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderPreview = () => {
    if (!currentPreview) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-start px-6 py-8 text-center text-sm text-gray-500 space-y-3">
          <button
            type="button"
            onClick={handleManualUploadClick}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
            disabled={availableSlots <= 0}
          >
            Click to upload
          </button>
          <FaPaperclip className="w-10 h-10 text-gray-400 mt-2" />
          <div>
            <p className="font-medium text-gray-700 mb-1">No attachments selected yet.</p>
            <p className="text-xs text-gray-500">
              Drag and drop files into this area, or click the button to choose files.
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Supports PNG, JPG, or PDF (max 10 MB each, up to 5 files).
          </p>
        </div>
      );
    }

    if (currentPreview.type?.startsWith('image/')) {
      return (
        <div className="inline-block bg-gray-200">
          <img
            src={currentPreview.url}
            alt={currentPreview.name}
            className="max-w-none block"
            style={{ transform: `scale(${clampedZoom})`, transformOrigin: 'top left' }}
          />
        </div>
      );
    }

    if (currentPreview.type === 'application/pdf') {
      const zoomValue = Math.round(clampedZoom * 100);
      const pdfSrc = `${currentPreview.url}#toolbar=0&navpanes=0&view=FitH&zoom=${zoomValue}`;
      return (
        <div className="inline-block min-w-full">
          <iframe
            key={pdfSrc}
            src={pdfSrc}
            title={currentPreview.name}
            className="w-full h-[70vh] bg-gray-200 border-0"
          />
        </div>
      );
    }

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-sm text-gray-500 space-y-2">
        <FaFileAlt className="w-10 h-10 text-gray-400" />
        <p>Preview not available. Use "Open" to view this file in a new tab.</p>
      </div>
    );
  };

  const autoFillStatusClasses = {
    processing: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700'
  };

  const autoFillDisplayMessage = autoFillMessage
    || (autoFillStatus === 'processing'
      ? 'Smart fill is analyzing the document...'
      : autoFillStatus === 'success'
        ? 'Smart fill complete. Review the detected values.'
        : autoFillStatus === 'error'
          ? 'Smart fill could not read this document.'
          : '');

  return (
    <div className={`flex h-full flex-col gap-4 pb-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        multiple
        onChange={handleFileInputChange}
      />
      <div className="flex flex-col flex-1 min-h-[60vh] max-h-[78vh] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-3 sm:px-4 py-3 border-b bg-gray-50 sticky top-0 z-10 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => onDocumentTypeChange(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="invoice">Invoice</option>
                <option value="receipt">Receipt</option>
                <option value="statement">Bank Statement</option>
                <option value="other">Other</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Tag what you're capturing so badges and filters stay accurate.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                Expense Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => onPaymentStatusChange(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="open">Open</option>
                <option value="paid">Paid</option>
                <option value="late">Late</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Change this when the document should update account balances.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[180px]">
              <p className="text-sm font-semibold text-gray-800">Attachment Preview</p>
              <p className="text-xs text-gray-500">
                {previewItems.length > 0 ? 'Latest upload opens automatically.' : 'Upload a file to preview it here.'}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">
                  {documentTypeLabel}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full uppercase tracking-wide ${
                    paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : paymentStatus === 'late'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {paymentStatusLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={handleManualUploadClick}
                disabled={availableSlots <= 0}
                className="inline-flex items-center px-3 py-2 text-xs font-medium border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add files
              </button>
              <button
                type="button"
                onClick={() => setShowOptions(prev => !prev)}
                className="inline-flex items-center px-3 py-2 text-xs font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                {showOptions ? 'Hide attachment options' : 'Show attachment options'}
              </button>
              <button
                type="button"
                onClick={() => adjustZoom(-ZOOM_STEP)}
                disabled={!hasPreview}
                className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom out"
              >
                <FaSearchMinus className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={ZOOM_STEP}
                  value={clampedZoom}
                  onChange={(e) => handleZoomSlider(e.target.value)}
                  disabled={!hasPreview}
                  className="w-32"
                />
                <span className="text-xs font-medium text-gray-700 min-w-[3rem] text-center">
                  {Math.round(clampedZoom * 100)}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => adjustZoom(ZOOM_STEP)}
                disabled={!hasPreview}
                className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom in"
              >
                <FaSearchPlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={openInNewTab}
                disabled={!hasPreview}
                className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Open in new tab"
              >
                <FaExternalLinkAlt className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div
          ref={previewContainerRef}
          className="flex-1 bg-gray-100 overflow-y-auto"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="min-h-full overflow-x-auto">
            {renderPreview()}
          </div>
        </div>
        <div className="px-3 sm:px-4 py-3 border-t bg-white">
          {previewItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {previewItems.map(item => (
                <div key={item.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPreviewId(item.id);
                      setZoomLevel(DEFAULT_ZOOM);
                    }}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      currentPreviewId === item.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                    title={item.name}
                  >
                    {item.name.length > 26 ? `${item.name.slice(0, 24)}…` : item.name}
                  </button>
                  {item.source === 'existing' && onExistingAttachmentsChange && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (window.confirm(`Remove "${item.name}"? This will delete the attachment from this expense.`)) {
                          const attachmentIndex = existingAttachments.findIndex(
                            att => {
                              const attId = att.id ? `existing-${att.id}` : `existing-${existingAttachments.indexOf(att)}-${att.fileName || 'attachment'}`;
                              return attId === item.id;
                            }
                          );
                          if (attachmentIndex !== -1) {
                            const updated = existingAttachments.filter((_, idx) => idx !== attachmentIndex);
                            onExistingAttachmentsChange(updated);
                            // If we're viewing this attachment, switch to another or clear preview
                            if (currentPreviewId === item.id) {
                              const remaining = previewItems.filter(p => p.id !== item.id);
                              if (remaining.length > 0) {
                                setCurrentPreviewId(remaining[0].id);
                              } else {
                                setCurrentPreviewId(null);
                              }
                            }
                          }
                        }
                      }}
                      className="ml-1 p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full border border-red-200 hover:border-red-300 transition-colors"
                      title="Remove attachment"
                      aria-label="Remove attachment"
                    >
                      <FaTimes className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No files attached yet.</p>
          )}
        </div>
      </div>

      {showOptions && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-3">
          {autoFillStatus !== 'idle' && autoFillDisplayMessage && (
            <div className={`border rounded-md px-3 py-2 text-xs flex items-center justify-between gap-3 ${autoFillStatusClasses[autoFillStatus] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              <span className="font-medium">{autoFillDisplayMessage}</span>
              {autoFillStatus === 'processing' && (
                <span className="shrink-0 font-semibold">
                  {Math.min(100, Math.max(0, Math.round(autoFillProgress)))}%
                </span>
              )}
            </div>
          )}

          {existingAttachments?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <p className="text-xs text-blue-800">
                Existing attachments remain linked. Uploading new files will add to them.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notesValue}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[3rem]"
              placeholder="Add quick notes (expand for more detail)"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const normalizeVendorName = (value = '') => {
  return value
    ?.toString()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '';
};

const normalizeInvoiceNumber = (value = '') => {
  return value
    ?.toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim() || '';
};

const tokenizeVendorName = (value = '') => {
  const normalized = normalizeVendorName(value);
  if (!normalized) return [];
  return Array.from(new Set(normalized.split(' ').filter(Boolean)));
};

const computeVendorMatchScore = (profile, details, normalizedVendor, normalizedInvoice) => {
  if (!profile || !details) return 0;

  let score = 0;
  const profileName = profile.normalizedName || normalizeVendorName(profile.name || '');
  const profileTokens = tokenizeVendorName(profileName || profile.displayName || '');
  const candidateVendor = details.vendor || details.vendorName || '';
  const candidateTokens = tokenizeVendorName(candidateVendor);

  if (normalizedVendor && profileName) {
    if (profileName === normalizedVendor) {
      score += 70;
    } else if (profileName.includes(normalizedVendor) || normalizedVendor.includes(profileName)) {
      score += 45;
    }
  }

  if (candidateTokens.length > 0 && profileTokens.length > 0) {
    const sharedTokens = candidateTokens.filter(token => profileTokens.includes(token));
    if (sharedTokens.length > 0) {
      score += sharedTokens.length * 12;
      if (sharedTokens.length >= Math.min(2, profileTokens.length)) {
        score += 20;
      }
    }
  }

  if (normalizedInvoice) {
    const invoiceMatches =
      (Array.isArray(profile.invoiceNumbers) && profile.invoiceNumbers.some(num => normalizeInvoiceNumber(num) === normalizedInvoice)) ||
      (profile.lastInvoiceNumber && normalizeInvoiceNumber(profile.lastInvoiceNumber) === normalizedInvoice);
    if (invoiceMatches) {
      score += 80;
    }
  }

  const candidateCountry = details.vendorCountry || details.country || '';
  if (candidateCountry) {
    if (
      (profile.country && profile.country === candidateCountry) ||
      (Array.isArray(profile.countries) && profile.countries.includes(candidateCountry))
    ) {
      score += 12;
    }
  }

  const candidateCurrency = details.currency || details.baseCurrency || '';
  if (candidateCurrency) {
    if (profile.preferredCurrency === candidateCurrency) {
      score += 10;
    } else if (Array.isArray(profile.currencies) && profile.currencies.includes(candidateCurrency)) {
      score += 6;
    }
  }

  const candidateAddress = details.vendorAddress || '';
  if (candidateAddress && profile.primaryAddress) {
    const addressTokens = tokenizeVendorName(candidateAddress);
    const profileAddressTokens = tokenizeVendorName(profile.primaryAddress);
    const sharedAddressTokens = addressTokens.filter(token => profileAddressTokens.includes(token));
    if (sharedAddressTokens.length >= 2) {
      score += 10;
    }
  }

  if (profile.usageCount) {
    score += Math.min(10, profile.usageCount);
  }

  return score;
};

const vendorTextLooksNoisy = (value = '') => {
  if (!value) return false;
  const text = value.toString().trim();
  if (text.length === 0) return false;
  if (text.length > 80) return true;
  const lower = text.toLowerCase();
  const noiseKeywords = [
    'invoice number',
    'receipt',
    'subtotal',
    'total',
    'amount paid',
    'payment method',
    'page ',
    'bill to'
  ];
  if (noiseKeywords.some(keyword => lower.includes(keyword))) {
    return true;
  }
  const commaCount = (text.match(/,/g) || []).length;
  if (commaCount >= 5) {
    return true;
  }
  return false;
};

const vendorAddressNeedsAssistance = (value = '') => {
  const text = value?.toString().trim();
  if (!text) return true;
  if (text.length < 10) return true;
  const lower = text.toLowerCase();
  if (
    lower.includes('bill to') ||
    lower.includes('ship to') ||
    lower.includes('customer') ||
    lower.includes('client') ||
    lower.includes('subtotal') ||
    lower.includes('total') ||
    lower.includes('amount paid') ||
    lower.includes('@') ||
    lower.includes('http')
  ) {
    return true;
  }
  const commaCount = (text.match(/,/g) || []).length;
  if (commaCount >= 6) return true;
  return false;
};

const buildContractSnapshot = (contract) => {
  if (!contract) return null;
  const numericValue = parseFloat(contract.value);
  return {
    id: contract.id || '',
    name: contract.name || '',
    reference: contract.reference || '',
    vendorId: contract.vendorId || '',
    vendorName: contract.vendorName || '',
    status: contract.status || '',
    startDate: contract.startDate || '',
    endDate: contract.endDate || '',
    currency: contract.currency || '',
    value: Number.isFinite(numericValue) ? numericValue : null,
    url: contract.url || ''
  };
};

const getPrettifiedCurrency = (value) => {
  if (!value) return '';
  const numericValue = parseFloat(value);
  if (!Number.isFinite(numericValue)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numericValue);
};

const ExpenseTracker = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompany, currentCompanyId, performExpenseMigration } = useCompany();
  const companyCountry = currentCompany?.country || 'NL';
  
  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  
  // Constants
  const categories = ['Subscriptions', 'Office', 'One-time', 'Donations', 'Marketing', 'Other'];
  const btw_rates = [0, 9, 21];
  const bankAccounts = ['Business Checking', 'Business Savings', 'Credit Card - Business', 'Cash', 'Personal (Reimbursable)'];
  const paymentMethods = ['Debit Card', 'Credit Card', 'Bank Transfer', 'Cash', 'PayPal', 'Other'];
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
const documentTypeOptions = [
  { value: 'all', label: 'All Documents' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'statement', label: 'Statements' },
  { value: 'other', label: 'Other' }
];

const documentTypeStyles = {
  invoice: { label: 'Invoice', classes: 'bg-blue-100 text-blue-800' },
  receipt: { label: 'Receipt', classes: 'bg-green-100 text-green-800' },
  statement: { label: 'Statement', classes: 'bg-[#D4F5EF] text-[#184E55]' },
  other: { label: 'Other', classes: 'bg-gray-200 text-gray-700' }
};

const paymentStatusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'paid', label: 'Paid' },
  { value: 'late', label: 'Late' }
];

const paymentStatusStyles = {
  open: { label: 'Open', classes: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', classes: 'bg-green-100 text-green-800' },
  late: { label: 'Late', classes: 'bg-red-100 text-red-800' }
};

const approvalStatusChoices = [
  { value: 'draft', label: 'Draft' },
  { value: 'awaiting', label: 'Awaiting Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const approvalFilterOptions = [
  { value: 'all', label: 'All Approvals' },
  ...approvalStatusChoices
];

const approvalStatusStyles = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
  awaiting: { label: 'Awaiting Approval', classes: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approved', classes: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-700' }
};

  // State Management
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false); // Start false to render UI immediately
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [financialAccountsLoading, setFinancialAccountsLoading] = useState(false);
  const [financialAccountsError, setFinancialAccountsError] = useState('');
  const [formError, setFormError] = useState('');
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState('');
  const [companyMembers, setCompanyMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [currentAccountId] = useState(1);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [showNormalizeModal, setShowNormalizeModal] = useState(false);
  const [normalizeStatus, setNormalizeStatus] = useState({
    state: 'idle',
    total: 0,
    processed: 0,
    skipped: 0,
    errors: []
  });
  const [newFilePreviews, setNewFilePreviews] = useState([]);
  const [autoFillStatus, setAutoFillStatus] = useState('idle');
  const [autoFillMessage, setAutoFillMessage] = useState('');
  const [autoFillProgress, setAutoFillProgress] = useState(0);
  const [lastAutoFilledFile, setLastAutoFilledFile] = useState(null);
  useEffect(() => {
    const previews = selectedFiles.map(file => ({
      id: `new-${file.name}-${file.lastModified}`,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      source: 'new'
    }));

    setNewFilePreviews(previews);

    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [selectedFiles]);

  const previewItems = useMemo(() => {
    const existing = (existingAttachments || []).map((attachment, index) => ({
      id: attachment.id ? `existing-${attachment.id}` : `existing-${index}-${attachment.fileName || 'attachment'}`,
      name: attachment.fileName || `Attachment ${index + 1}`,
      type: attachment.fileType || '',
      url: attachment.fileUrl,
      uploadedAt: attachment.uploadedAt,
      size: attachment.fileSize,
      source: 'existing'
    }));

    return [...existing, ...newFilePreviews];
  }, [existingAttachments, newFilePreviews]);

  useEffect(() => {
    if (previewItems.length === 0) {
      setCurrentPreviewId(null);
      setZoomLevel(DEFAULT_ZOOM);
      return;
    }

    setCurrentPreviewId(prev => {
      const newest = previewItems[previewItems.length - 1];
      if (newest && newest.source === 'new') {
        setZoomLevel(DEFAULT_ZOOM);
        return newest.id;
      }

      if (prev && previewItems.some(item => item.id === prev)) {
        return prev;
      }

      setZoomLevel(DEFAULT_ZOOM);
      return previewItems[0].id;
    });
  }, [previewItems]);

  const [currentPreviewId, setCurrentPreviewId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);

  const resetAutoFillState = () => {
    setAutoFillStatus('idle');
    setAutoFillMessage('');
    setAutoFillProgress(0);
  };

  const normalizeDateString = (value) => {
    if (!value) return '';
    const cleaned = value.replace(/\./g, '-').replace(/\//g, '-').trim();
    const parts = cleaned.split('-').map(part => part.trim());

    if (parts.length === 3) {
      let [a, b, c] = parts;
      if (c.length === 2) {
        c = c.length === 2 ? `20${c}` : c;
      }

      let day;
      let month;
      let year = c;

      if (parseInt(a, 10) > 12) {
        day = a;
        month = b;
      } else if (parseInt(b, 10) > 12) {
        day = b;
        month = a;
      } else {
        day = a;
        month = b;
      }

      if (!day || !month || !year) return '';

      return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const fallback = new Date(value);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toISOString().split('T')[0];
    }

    return '';
  };

  const parseNumericAmount = (raw) => {
    if (!raw) return null;
    let sanitized = raw.replace(/[^0-9,.-]/g, '');

    if (sanitized.includes(',') && sanitized.includes('.')) {
      if (sanitized.lastIndexOf(',') > sanitized.lastIndexOf('.')) {
        sanitized = sanitized.replace(/\./g, '').replace(',', '.');
      } else {
        sanitized = sanitized.replace(/,/g, '');
      }
    } else if (sanitized.includes(',')) {
      sanitized = sanitized.replace(',', '.');
    }

    const value = parseFloat(sanitized);
    if (!Number.isFinite(value)) return null;
    return value;
  };

  const buildImportKey = ({ date, invoiceDate, vendor, amount, invoiceNumber }) => {
    const canonicalDate = (date || invoiceDate || '').slice(0, 10);
    const vendorKey = (vendor || '').toLowerCase().trim();
    const invoiceKey = (invoiceNumber || '').toLowerCase().trim();
    const numericAmount = Number.isFinite(amount) ? amount : parseFloat(amount || 0);
    const amountKey = Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : '0.00';
    return `${canonicalDate}|${vendorKey}|${amountKey}|${invoiceKey}`;
  };

  const toDateInstance = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (value?.toDate) {
      try {
        const parsed = value.toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      } catch {
        return null;
      }
    }
    if (value?.seconds) {
      const parsed = new Date(value.seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const formatDateTime = (value, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
    const date = toDateInstance(value);
    if (!date) return '—';
    return new Intl.DateTimeFormat(undefined, options).format(date);
  };

  const resolveUserName = (userId) => {
    if (!userId) {
      return 'System';
    }
    const profile = userProfiles[userId];
    if (!profile) {
      return `User ${String(userId).slice(0, 6)}`;
    }
    return profile.displayName || profile.fullName || profile.email || `User ${String(userId).slice(0, 6)}`;
  };

  const hydrateUserProfiles = useCallback(async (expensesList = []) => {
    if (!Array.isArray(expensesList) || expensesList.length === 0) {
      return;
    }

    const idsToLoad = new Set();
    expensesList.forEach((expense) => {
      if (expense?.createdBy) idsToLoad.add(expense.createdBy);
      if (expense?.updatedBy) idsToLoad.add(expense.updatedBy);
      if (expense?.linkedPaymentRecordedBy) idsToLoad.add(expense.linkedPaymentRecordedBy);
      if (expense?.linkedStatementMatchedBy) idsToLoad.add(expense.linkedStatementMatchedBy);
    });

    const newIds = Array.from(idsToLoad).filter((id) => id && !loadedUserIdsRef.current.has(id));
    if (newIds.length === 0) {
      return;
    }

    const profileResults = await Promise.all(newIds.map(async (userId) => {
      try {
        const profile = await getUserProfile(userId);
        return { userId, profile };
      } catch (error) {
        console.warn('Failed to load user profile', userId, error);
        return { userId, profile: null };
      }
    }));

    const profileMap = {};
    profileResults.forEach(({ userId, profile }) => {
      loadedUserIdsRef.current.add(userId);
      if (profile) {
        profileMap[userId] = profile;
      }
    });

    if (Object.keys(profileMap).length > 0) {
      setUserProfiles((prev) => ({
        ...prev,
        ...profileMap
      }));
    }
  }, []);

  const parseExpenseDetailsFromText = (text) => {
    if (!text) return {};

    const fields = {};
    const normalized = text.replace(/\r/g, ' ');
    const lower = normalized.toLowerCase();
    const lines = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const collapsedLines = lines.map(line => line.replace(/\s{2,}/g, ' ').trim()).filter(Boolean);

    // Document type inference
    if (lower.includes('invoice')) {
      fields.documentType = 'invoice';
    } else if (lower.includes('receipt')) {
      fields.documentType = 'receipt';
    } else if (lower.includes('statement')) {
      fields.documentType = 'statement';
    } else if (lower.includes('bill')) {
      fields.documentType = 'invoice';
    }

    // Invoice number
    const invoiceMatch = normalized.match(/invoice\s*(?:number|no\.?|#)\s*[-:]?\s*([a-z0-9][a-z0-9\-_/]+)/i);
    if (invoiceMatch && invoiceMatch[1]) {
      fields.invoiceNumber = invoiceMatch[1].toUpperCase();
    } else {
      const invoiceLine = collapsedLines.find(line => /^invoice\s*(?:number|no\.?|#)/i.test(line));
      if (invoiceLine) {
        const cleaned = invoiceLine.replace(/^invoice\s*(?:number|no\.?|#)\s*[-:]?/i, '').trim();
        const tokenMatch = cleaned.match(/[A-Z0-9]+(?:[-/][A-Z0-9]+)*/i);
        if (tokenMatch) {
          fields.invoiceNumber = tokenMatch[0].toUpperCase();
        }
      }
    }

    if (!fields.invoiceNumber) {
      const splitInvoiceMatch = normalized.match(/invoice\s*(?:number|no\.?|#)?\s*[-:]?\s*([A-Z0-9]{3,})\s*(?:[-–]|[\s]{1,3})\s*([A-Z0-9]{2,})/i);
      if (splitInvoiceMatch) {
        fields.invoiceNumber = `${splitInvoiceMatch[1].toUpperCase()}-${splitInvoiceMatch[2].toUpperCase()}`;
      }
    }

    // Date detection
    const normalizeForDate = (value) => value.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
    const shortDateRegexp = /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g;
    const shortDateMatches = [...normalized.matchAll(shortDateRegexp)].map(match => match[1]);
    if (shortDateMatches.length > 0) {
      const isoShort = normalizeDateString(normalizeForDate(shortDateMatches[0]));
      if (isoShort) {
        fields.date = isoShort;
      }
      if (shortDateMatches[1]) {
        const isoSecond = normalizeDateString(normalizeForDate(shortDateMatches[1]));
        if (isoSecond && !fields.invoiceDate) {
          fields.invoiceDate = isoSecond;
        }
      }
    }

    const longDateRegexp = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi;
    const longDateMatches = [...normalized.matchAll(longDateRegexp)].map(match => match[0]);

    const issueMatch = normalized.match(/date of issue\s*[-:]?\s*([^\n]+)/i);
    if (issueMatch) {
      const isoIssue = normalizeDateString(normalizeForDate(issueMatch[1]));
      if (isoIssue) {
        fields.invoiceDate = isoIssue;
      }
    } else if (longDateMatches[0]) {
      const iso = normalizeDateString(normalizeForDate(longDateMatches[0]));
      if (iso) {
        fields.invoiceDate = iso;
      }
    }

    const dueMatch = normalized.match(/date due\s*[-:]?\s*([^\n]+)/i);
    if (dueMatch) {
      const isoDue = normalizeDateString(normalizeForDate(dueMatch[1]));
      if (isoDue) {
        fields.dueDate = isoDue;
      }
    } else if (longDateMatches[1]) {
      const iso = normalizeDateString(normalizeForDate(longDateMatches[1]));
      if (iso) {
        fields.dueDate = iso;
      }
    }

    if (!fields.date && fields.invoiceDate) {
      fields.date = fields.invoiceDate;
    }

    // Amount detection
    const amountCandidates = [];
    const seenAmounts = new Map();
    const recordAmount = (rawValue, score = 0, position = 0) => {
      const numeric = parseNumericAmount(rawValue);
      if (!Number.isFinite(numeric)) return;
      const key = numeric.toFixed(2);
      const existing = seenAmounts.get(key);
      if (existing) {
        existing.score = Math.max(existing.score, score);
        existing.position = Math.max(existing.position, position);
      } else {
        const candidate = { value: numeric, score, position };
        amountCandidates.push(candidate);
        seenAmounts.set(key, candidate);
      }
    };

    const prioritizedAmountPatterns = [
      { regex: /amount\s+(?:paid|received)[^0-9]*([0-9][0-9.,]*)/i, score: 12 },
      { regex: /\bpaid\s+on[^\n]*([0-9][0-9.,]*)/i, score: 10 },
      { regex: /\bamount\s+due[^0-9]*([0-9][0-9.,]*)/i, score: 9 },
      { regex: /\btotal\s+(?:amount|due|paid)?[^0-9]*([0-9][0-9.,]*)/i, score: 8 },
      { regex: /\bgrand\s+total[^0-9]*([0-9][0-9.,]*)/i, score: 8 },
      { regex: /\bbalance\s+(?:due|to pay)[^0-9]*([0-9][0-9.,]*)/i, score: 7 }
    ];

    prioritizedAmountPatterns.forEach(({ regex, score }) => {
      const match = normalized.match(regex);
      if (match && match[1]) {
        recordAmount(match[1], score, collapsedLines.length + score);
      }
    });

    for (let idx = collapsedLines.length - 1; idx >= 0; idx -= 1) {
      const line = collapsedLines[idx];
      if (!line) continue;
      let contextScore = 1;
      const lowerLine = line.toLowerCase();
      if (/\bamount\s+paid\b/.test(lowerLine)) contextScore += 8;
      if (/\bamount\s+due\b/.test(lowerLine)) contextScore += 6;
      if (/\btotal\b/.test(lowerLine)) contextScore += 5;
      if (/\bsubtotal\b/.test(lowerLine)) contextScore += 2;
      if (/\bvat\b|\btax\b/.test(lowerLine)) contextScore += 1;
      if (/\bpayment\b/.test(lowerLine)) contextScore += 2;

      const matches = [...line.matchAll(/[€$£]?\s*([0-9][0-9.,]+)/g)];
      matches.forEach(match => {
        recordAmount(match[1], contextScore, collapsedLines.length - idx);
      });
    }

    if (amountCandidates.length === 0) {
      const fallbackMatches = [...normalized.matchAll(/\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))\b/g)];
      fallbackMatches.forEach(match => recordAmount(match[1], 0, 0));
    }

    if (amountCandidates.length > 0) {
      amountCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.position !== a.position) return b.position - a.position;
        return a.value - b.value;
      });
      fields.amount = amountCandidates[0].value.toFixed(2);
    }

    if (normalized.includes('€') || /eur/i.test(normalized)) {
      fields.currency = 'EUR';
    } else if (normalized.includes('$') || /usd/i.test(normalized)) {
      fields.currency = 'USD';
    } else if (normalized.includes('£') || /gbp|pounds?/i.test(normalized)) {
      fields.currency = 'GBP';
    }

    // Vendor detection
    const billToIndex = collapsedLines.findIndex(line => /^bill to\b/i.test(line));
    const linesBeforeBillTo = billToIndex > 0 ? collapsedLines.slice(0, billToIndex) : collapsedLines;
    if (billToIndex > 0) {
      const vendorBlock = [];
      for (let idx = billToIndex - 1; idx >= 0; idx -= 1) {
        const line = collapsedLines[idx];
        if (!line || /^bill to\b/i.test(line) || /^invoice\b/i.test(line) || /^page\s+/i.test(line)) {
          break;
        }
        if (/invoice\s*(?:number|no\.?|#)/i.test(line)) continue;
        if (/date (of issue|due)/i.test(line)) continue;
        if (/amount|total|tax|subtotal/i.test(line)) continue;
        vendorBlock.unshift(line);
      }
      const sanitizedBlock = vendorBlock.filter(Boolean);
      if (sanitizedBlock.length) {
        const cleanedBlock = sanitizedBlock.filter(line =>
          !/^page\b/i.test(line) &&
          !/^invoice\b/i.test(line) &&
          !/invoice\s*(?:number|no\.?|#)/i.test(line)
        );
        const cleanCandidate = (line = '') => {
          if (!line) return '';
          let candidate = line.replace(/^\d+\s+/, '').replace(/\s{2,}/g, ' ').trim();
          if (!candidate) return '';
          const numberIndex = candidate.search(/\d/);
          if (numberIndex > 0) {
            const preNumber = candidate.slice(0, numberIndex).trim();
            if (preNumber && preNumber.split(/\s+/).length <= 5) {
              candidate = preNumber;
            }
          }
          candidate = candidate.replace(/[,.;:|\-]+$/g, '').trim();
          if (candidate.split(/\s+/).length > 6) {
            const shortened = candidate.split(/\s+/).slice(0, 5).join(' ');
            if (shortened.length >= 3) {
              candidate = shortened;
            }
          }
          const lowerCandidate = candidate.toLowerCase();
          const keywordStops = [
            'receipt',
            'invoice',
            'number',
            'total',
            'amount',
            'subtotal',
            'tax',
            'payment',
            'paid',
            'history',
            'method',
            'qty',
            'description',
            'balance',
            'bill to',
            'ship to',
            'customer',
            'client'
          ];
          let stopIndex = -1;
          keywordStops.forEach(keyword => {
            const index = lowerCandidate.indexOf(keyword);
            if (index !== -1 && (stopIndex === -1 || index < stopIndex)) {
              stopIndex = index;
            }
          });
          if (stopIndex > 0) {
            candidate = candidate.slice(0, stopIndex).trim();
          }
          return candidate;
        };

        const vendorNoiseRegex = /(receipt|invoice|number|date|amount|total|subtotal|tax|paid|payment|history|method|page|qty|description|unit price|balance)/i;
        const prioritizedVendor =
          cleanedBlock
            .map(cleanCandidate)
            .filter(Boolean)
            .filter(line => !vendorNoiseRegex.test(line))
            .find(line => /(limited|ltd|inc|llc|gmbh|s\.a\.|sarl|oy|ab|company|co\.)/i.test(line)) ||
          cleanedBlock
            .map(cleanCandidate)
            .filter(Boolean)
            .filter(line => !vendorNoiseRegex.test(line))
            .find(line => !/[0-9]{3,}/.test(line) && line.split(/\s+/).length <= 5) ||
          cleanCandidate(cleanedBlock[0]);

        if (prioritizedVendor) {
          fields.vendor = prioritizedVendor;
          const vendorIndexInBlock = sanitizedBlock.findIndex(line => line.includes(prioritizedVendor));
          const addressLines = [];
          for (let idx = vendorIndexInBlock + 1; idx < sanitizedBlock.length; idx += 1) {
            const rawLine = sanitizedBlock[idx];
            if (!rawLine) break;
            if (/bill to|ship to|deliver to|description|qty|unit price|subtotal|total|amount|paid|payment|invoice|customer|client|grandville|grandcart|email|@|www|tax id/i.test(rawLine)) {
              break;
            }
            const cleaned = rawLine.replace(/\s{2,}/g, ' ').trim();
            if (!cleaned) continue;
            if (cleaned === prioritizedVendor) continue;
            if (vendorNoiseRegex.test(cleaned)) continue;
            const wordCount = cleaned.split(/\s+/).length;
            if (wordCount > 12) continue;
            addressLines.push(cleaned);
            if (addressLines.length >= 3) break;
          }
          if (addressLines.length) {
            fields.vendorAddress = addressLines.filter((line, index, arr) => arr.indexOf(line) === index).join(', ');
          }
        }
      }
    }

    if (!fields.vendor) {
      const vendorFallback = linesBeforeBillTo
        .map(line => line.replace(/^\d+\s+/, '').trim())
        .find(line =>
          /(limited|inc|llc|bv|b\.v\.|gmbh|s\.a\.|sarl|oy|ab|ltd|plc|pte|company|co\.)/i.test(line)
        );
      if (vendorFallback) {
        fields.vendor = vendorFallback;
        const vendorIndex = collapsedLines.indexOf(vendorFallback);
        const fallbackAddress = [];
        for (let idx = vendorIndex + 1; idx < Math.min(collapsedLines.length, vendorIndex + 6); idx += 1) {
          const rawLine = collapsedLines[idx];
          if (!rawLine) break;
          if (/bill to|ship to|description|qty|unit price|subtotal|total|amount|paid|payment|invoice|customer|client|email|@|www|tax id/i.test(rawLine)) {
            break;
          }
          const cleaned = rawLine.replace(/\s{2,}/g, ' ').trim();
          if (!cleaned) continue;
          if (cleaned === vendorFallback) continue;
          if (cleaned.split(/\s+/).length > 12) continue;
          fallbackAddress.push(cleaned);
          if (fallbackAddress.length >= 3) break;
        }
        if (fallbackAddress.length) {
          fields.vendorAddress = fallbackAddress.filter((line, index, arr) => arr.indexOf(line) === index).join(', ');
        }
      }
    }

    if (fields.vendor && !fields.vendorAddress) {
      const vendorIndex = collapsedLines.indexOf(fields.vendor);
      if (vendorIndex !== -1) {
        const addressLines = [];
        for (let idx = vendorIndex + 1; idx < Math.min(collapsedLines.length, vendorIndex + 6); idx += 1) {
          const rawLine = collapsedLines[idx];
          if (!rawLine) break;
          if (/bill to|ship to|description|qty|unit price|subtotal|total|amount|paid|payment|invoice|customer|client|email|@|www|tax id/i.test(rawLine)) {
            break;
          }
          const cleaned = rawLine.replace(/\s{2,}/g, ' ').trim();
          if (!cleaned) continue;
          if (cleaned === fields.vendor) continue;
          if (cleaned.split(/\s+/).length > 12) continue;
          addressLines.push(cleaned);
          if (addressLines.length >= 3) break;
        }
        if (addressLines.length) {
          fields.vendorAddress = addressLines.filter((line, index, arr) => arr.indexOf(line) === index).join(', ');
        }
      }
    }

    if (!fields.vendor) {
      const simplifiedCandidates = linesBeforeBillTo
        .map(line => line.replace(/\s{2,}/g, ' ').trim())
        .filter(Boolean)
        .filter(line => !/(bill to|ship to|deliver to|description|qty|unit price|subtotal|total|amount|paid|payment|invoice|customer|client|email|@|www|tax id)/i.test(line))
        .filter(line => !/[0-9]{3,}/.test(line))
        .filter(line => line.length <= 40);
      if (simplifiedCandidates.length) {
        const primary = simplifiedCandidates[0].split(',')[0].trim();
        if (primary) {
          fields.vendor = primary;
        }
      }
    }

    // Enhanced country detection from vendor address
    if (!fields.vendorCountry) {
      const vendorText = `${fields.vendor || ''} ${fields.vendorAddress || ''}`.toLowerCase();
      const fullText = normalized.toLowerCase();
      
      // 1. Check for country codes (2-letter ISO codes) in the text
      const countryCodeRegex = /\b([A-Z]{2})\b/g;
      const countryCodeMatches = [];
      let match;
      const upperText = `${fields.vendor || ''} ${fields.vendorAddress || ''}`.toUpperCase();
      while ((match = countryCodeRegex.exec(upperText)) !== null) {
        const code = match[1];
        // Check if it's a valid country code
        const euCountry = EU_COUNTRY_OPTIONS.find(c => c.code === code);
        if (euCountry) {
          countryCodeMatches.push({ code, position: match.index });
        }
      }
      // Also check global country codes
      const globalCountryCodes = ['US', 'CA', 'GB', 'AU', 'NZ', 'IN', 'IL', 'JP', 'CN', 'KR', 'BR', 'MX', 'ZA', 'SG', 'AE', 'CH', 'NO'];
      for (const code of globalCountryCodes) {
        if (upperText.includes(code) && !countryCodeMatches.find(m => m.code === code)) {
          countryCodeMatches.push({ code, position: upperText.indexOf(code) });
        }
      }
      // Prefer country codes that appear later in the text (likely in address)
      if (countryCodeMatches.length > 0) {
        countryCodeMatches.sort((a, b) => b.position - a.position);
        fields.vendorCountry = countryCodeMatches[0].code;
      }
    }

    if (!fields.vendorCountry) {
      const vendorText = `${fields.vendor || ''} ${fields.vendorAddress || ''}`.toLowerCase();
      const fullText = normalized.toLowerCase();
      
      // 2. Check for full country names (EU countries)
      const countryMatch = EU_COUNTRY_OPTIONS.find(country => {
        const labelLower = country.label.toLowerCase();
        // Check if country name appears as a whole word
        const regex = new RegExp(`\\b${labelLower}\\b`, 'i');
        return regex.test(vendorText) || regex.test(fullText);
      });
      if (countryMatch) {
        fields.vendorCountry = countryMatch.code;
      }
    }

    if (!fields.vendorCountry) {
      const vendorText = `${fields.vendor || ''} ${fields.vendorAddress || ''}`.toLowerCase();
      const fullText = normalized.toLowerCase();
      
      // 3. Check for global country names
      const globalCountryCandidates = [
        { code: 'US', keywords: ['united states', 'u.s.a', 'u.s.', 'usa', 'america', 'american'] },
        { code: 'CA', keywords: ['canada', 'canadian'] },
        { code: 'GB', keywords: ['united kingdom', 'england', 'scotland', 'wales', 'uk', 'great britain', 'british'] },
        { code: 'AU', keywords: ['australia', 'australian'] },
        { code: 'NZ', keywords: ['new zealand', 'kiwi'] },
        { code: 'IN', keywords: ['india', 'indian'] },
        { code: 'IL', keywords: ['israel', 'israeli'] },
        { code: 'JP', keywords: ['japan', 'japanese'] },
        { code: 'CN', keywords: ['china', 'chinese'] },
        { code: 'KR', keywords: ['south korea', 'korea', 'korean'] },
        { code: 'BR', keywords: ['brazil', 'brazilian'] },
        { code: 'MX', keywords: ['mexico', 'mexican'] },
        { code: 'ZA', keywords: ['south africa', 'south african'] },
        { code: 'SG', keywords: ['singapore', 'singaporean'] },
        { code: 'AE', keywords: ['united arab emirates', 'uae', 'dubai', 'abu dhabi'] },
        { code: 'CH', keywords: ['switzerland', 'swiss'] },
        { code: 'NO', keywords: ['norway', 'norwegian'] }
      ];
      for (const candidate of globalCountryCandidates) {
        if (candidate.keywords.some(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'i');
          return regex.test(vendorText) || regex.test(fullText);
        })) {
          fields.vendorCountry = candidate.code;
          break;
        }
      }
    }

    if (!fields.vendorCountry) {
      const vendorText = `${fields.vendor || ''} ${fields.vendorAddress || ''}`.toLowerCase();
      const fullText = normalized.toLowerCase();
      
      // 4. Check for major cities that indicate countries
      const cityCountryMap = [
        // US cities
        { cities: ['new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville', 'san francisco', 'indianapolis', 'columbus', 'fort worth', 'charlotte', 'seattle', 'denver', 'washington', 'boston', 'el paso', 'detroit', 'nashville', 'portland', 'oklahoma city', 'las vegas', 'memphis', 'louisville', 'baltimore', 'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento', 'kansas city', 'mesa', 'atlanta', 'omaha', 'colorado springs', 'raleigh', 'virginia beach', 'miami', 'oakland', 'minneapolis', 'tulsa', 'cleveland', 'wichita', 'arlington'], country: 'US' },
        // UK cities
        { cities: ['london', 'birmingham', 'manchester', 'glasgow', 'liverpool', 'leeds', 'sheffield', 'edinburgh', 'bristol', 'cardiff', 'belfast', 'newcastle', 'nottingham', 'southampton', 'derby', 'portsmouth', 'brighton', 'reading', 'northampton', 'luton', 'wolverhampton', 'bolton', 'bournemouth', 'norwich', 'swansea', 'southend-on-sea', 'blackpool', 'oxford', 'cambridge', 'york'], country: 'GB' },
        // Canadian cities
        { cities: ['toronto', 'montreal', 'calgary', 'ottawa', 'edmonton', 'winnipeg', 'vancouver', 'mississauga', 'brampton', 'hamilton', 'quebec', 'surrey', 'laval', 'halifax', 'london', 'markham', 'vaughan', 'gatineau', 'saskatoon', 'longueuil', 'kitchener', 'burnaby', 'windsor', 'regina', 'richmond', 'richmond hill', 'oakville', 'burlington', 'greater sudbury', 'sherbrooke'], country: 'CA' },
        // Australian cities
        { cities: ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'gold coast', 'newcastle', 'canberra', 'sunshine coast', 'wollongong', 'hobart', 'geelong', 'townsville', 'cairns', 'darwin', 'toowoomba', 'ballarat', 'bendigo', 'albury', 'launceston', 'mackay', 'rockhampton', 'bunbury', 'bundaberg', 'coffs harbour', 'wagga wagga', 'hervey bay', 'port macquarie', 'shepparton', 'caloundra'], country: 'AU' },
        // Israeli cities
        { cities: ['tel aviv', 'jerusalem', 'haifa', 'rishon lezion', 'petah tikva', 'ashdod', 'netanya', 'beer sheva', 'bnei brak', 'holon', 'ramat gan', 'rehovot', 'bat yam', 'ashkelon', 'kfar saba', 'herzliya', 'hadera', 'raanana', 'modiin', 'lod', 'nazareth', 'ramla', 'givatayim', 'kiryat gat', 'kiryat motzkin', 'kiryat bialik', 'kiryat yam', 'kiryat shmona', 'eilat', 'tiberias'], country: 'IL' },
        // Other major cities
        { cities: ['paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg', 'montpellier', 'bordeaux', 'lille', 'rennes', 'reims', 'saint-étienne', 'le havre', 'toulon', 'grenoble', 'dijon', 'angers', 'nîmes', 'villeurbanne'], country: 'FR' },
        { cities: ['berlin', 'hamburg', 'munich', 'cologne', 'frankfurt', 'stuttgart', 'düsseldorf', 'dortmund', 'essen', 'leipzig', 'bremen', 'dresden', 'hannover', 'nuremberg', 'duisburg', 'bochum', 'wuppertal', 'bielefeld', 'bonn', 'münster'], country: 'DE' },
        { cities: ['rome', 'milan', 'naples', 'turin', 'palermo', 'genoa', 'bologna', 'florence', 'bari', 'catania', 'venice', 'verona', 'messina', 'padua', 'trieste', 'brescia', 'taranto', 'prato', 'modena', 'reggio calabria'], country: 'IT' },
        { cities: ['madrid', 'barcelona', 'valencia', 'seville', 'zaragoza', 'málaga', 'murcia', 'palma', 'las palmas', 'bilbao', 'alicante', 'córdoba', 'valladolid', 'vigo', 'gijón', 'hospitalet', 'granada', 'vitoria', 'a coruña', 'elche'], country: 'ES' },
        { cities: ['amsterdam', 'rotterdam', 'the hague', 'utrecht', 'eindhoven', 'groningen', 'tilburg', 'almere', 'breda', 'nijmegen', 'enschede', 'haarlem', 'arnhem', 'zaanstad', 'amersfoort', 'apeldoorn', 's-hertogenbosch', 'hoofddorp', 'maastricht', 'leiden'], country: 'NL' },
        { cities: ['tokyo', 'yokohama', 'osaka', 'nagoya', 'sapporo', 'fukuoka', 'kobe', 'kawasaki', 'kyoto', 'saitama', 'hiroshima', 'sendai', 'chiba', 'kitakyushu', 'sakai', 'niigata', 'hamamatsu', 'kumamoto', 'sagaminara', 'okayama'], country: 'JP' },
        { cities: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'chengdu', 'hangzhou', 'wuhan', 'xi\'an', 'tianjin', 'nanjing', 'chongqing', 'dongguan', 'shenyang', 'qingdao', 'dalian', 'zhengzhou', 'jinan', 'changsha', 'kunming', 'foshan'], country: 'CN' },
        { cities: ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata', 'surat', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna', 'vadodara', 'ghaziabad'], country: 'IN' },
        { cities: ['são paulo', 'rio de janeiro', 'brasília', 'salvador', 'fortaleza', 'belo horizonte', 'manaus', 'curitiba', 'recife', 'porto alegre', 'belém', 'goiânia', 'guarulhos', 'campinas', 'são luís', 'são gonçalo', 'maceió', 'duque de caxias', 'natal', 'teresina'], country: 'BR' },
        { cities: ['mexico city', 'guadalajara', 'monterrey', 'puebla', 'tijuana', 'león', 'juárez', 'torreón', 'querétaro', 'san luis potosí', 'mérida', 'mexicali', 'aguascalientes', 'tampico', 'cancún', 'acapulco', 'chihuahua', 'cuernavaca', 'toluca', 'morelia'], country: 'MX' },
        { cities: ['zurich', 'geneva', 'basel', 'bern', 'lausanne', 'winterthur', 'lucerne', 'st. gallen', 'lugano', 'biel', 'thun', 'koniz', 'la chaux-de-fonds', 'schaffhausen', 'fribourg', 'chur', 'ustern', 'sion', 'martigny', 'aarau'], country: 'CH' },
        { cities: ['oslo', 'bergen', 'trondheim', 'stavanger', 'bærum', 'kristiansand', 'fredrikstad', 'tromsø', 'sandnes', 'ålesund', 'tønsberg', 'haugesund', 'arendal', 'moss', 'bodø', 'hamar', 'kongsberg', 'harstad', 'molde', 'lillehammer'], country: 'NO' },
        { cities: ['stockholm', 'gothenburg', 'malmö', 'uppsala', 'västerås', 'örebro', 'linköping', 'helsingborg', 'jönköping', 'norrköping', 'lund', 'umeå', 'gävle', 'borås', 'södertälje', 'eskilstuna', 'halmstad', 'växjö', 'karlstad', 'sundsvall'], country: 'SE' },
        { cities: ['copenhagen', 'aarhus', 'odense', 'aalborg', 'esbjerg', 'randers', 'kolding', 'horsens', 'vejle', 'roskilde', 'herning', 'hørsholm', 'hvidovre', 'greve', 'silkeborg', 'næstved', 'fredericia', 'taastrup', 'ballerup', 'rødovre'], country: 'DK' },
        { cities: ['helsinki', 'espoo', 'tampere', 'vantaa', 'oulu', 'turku', 'jyväskylä', 'lahti', 'kuopio', 'pori', 'kouvola', 'joensuu', 'lappeenranta', 'hämeenlinna', 'vaasa', 'seinäjoki', 'rovaniemi', 'mikkeli', 'kotka', 'salo'], country: 'FI' }
      ];
      
      for (const mapping of cityCountryMap) {
        if (mapping.cities.some(city => {
          const regex = new RegExp(`\\b${city}\\b`, 'i');
          return regex.test(vendorText) || regex.test(fullText);
        })) {
          fields.vendorCountry = mapping.country;
          break;
        }
      }
    }

    if (!fields.vendorCountry) {
      // 5. Check the last line of vendor address (often contains country)
      if (fields.vendorAddress) {
        const addressLines = fields.vendorAddress.split(',').map(line => line.trim());
        const lastLine = addressLines[addressLines.length - 1]?.toLowerCase() || '';
        if (lastLine) {
          // Check if last line is a country name
          const countryMatch = EU_COUNTRY_OPTIONS.find(country => {
            const labelLower = country.label.toLowerCase();
            return lastLine === labelLower || lastLine.includes(labelLower);
          });
          if (countryMatch) {
            fields.vendorCountry = countryMatch.code;
          } else {
            // Check global countries
            const globalCountries = [
              { code: 'US', names: ['united states', 'usa', 'u.s.a'] },
              { code: 'CA', names: ['canada'] },
              { code: 'GB', names: ['united kingdom', 'uk', 'england'] },
              { code: 'AU', names: ['australia'] },
              { code: 'NZ', names: ['new zealand'] },
              { code: 'IL', names: ['israel'] },
              { code: 'JP', names: ['japan'] },
              { code: 'CN', names: ['china'] },
              { code: 'IN', names: ['india'] }
            ];
            for (const country of globalCountries) {
              if (country.names.some(name => lastLine === name || lastLine.includes(name))) {
                fields.vendorCountry = country.code;
                break;
              }
            }
          }
        }
      }
    }

    const vatInlineRegex = /\b([A-Z]{2})\s*VAT\s*([A-Z0-9]+)\b/i;
    const vatNumberRegex = /\bVAT\s*(?:number|no\.|nr)?\s*[-:]?\s*([A-Z0-9]{8,})\b/i;
    const vatMatch = normalized.match(vatInlineRegex) || normalized.match(vatNumberRegex);
    if (vatMatch) {
      if (vatMatch.length === 3) {
        fields.vatNumber = `${vatMatch[1].toUpperCase()}${vatMatch[2].toUpperCase()}`;
        fields.vendorCountry = fields.vendorCountry || vatMatch[1].toUpperCase();
      } else if (vatMatch[1]) {
        fields.vatNumber = vatMatch[1].toUpperCase().replace(/\s+/g, '');
      }
    }

    const vatRateMatch = normalized.match(/(\d{1,2})\s*%\s*(?:vat|btw)/i);
    if (vatRateMatch) {
      const rate = parseInt(vatRateMatch[1], 10);
      if (!Number.isNaN(rate)) {
        fields.btw = rate;
      }
    }

    if (lower.includes('reverse charge')) {
      fields.reverseCharge = true;
    }

    // Description extraction
    const descriptionHeaderIndex = collapsedLines.findIndex(line => /^description(\s+qty.*)?$/i.test(line));
    if (descriptionHeaderIndex !== -1) {
      const descriptionLines = [];
      for (let i = descriptionHeaderIndex + 1; i < collapsedLines.length; i += 1) {
        const candidate = collapsedLines[i];
        if (!candidate || /^(qty|unit price|amount|tax|subtotal|total|vat|amount due|bill to)/i.test(candidate)) {
          break;
        }
        descriptionLines.push(candidate);
        if (descriptionLines.length >= 2) {
          const joined = descriptionLines.join(' ');
          if (joined.length > 12) break;
        }
      }
      if (descriptionLines.length) {
        fields.description = descriptionLines.join(' ').replace(/\s{2,}/g, ' ').trim();
      }
    }

    if (!fields.description) {
      const descriptionSection = normalized.match(/description\s+([\s\S]+?)\bsubtotal\b/i);
      if (descriptionSection) {
        const snippet = descriptionSection[1]
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .slice(0, 2)
          .join(' ');
        if (snippet) {
          fields.description = snippet.replace(/\s{2,}/g, ' ').trim();
        }
      }
    }

    if (!fields.description && fields.vendor) {
      fields.description = `Invoice from ${fields.vendor}`;
    }

    if (fields.vendor) {
      fields.vendor = fields.vendor.replace(/\s{2,}/g, ' ').trim();
    }
    if (fields.vendorAddress) {
      fields.vendorAddress = fields.vendorAddress
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .filter((part, index, arr) => arr.indexOf(part) === index)
        .join(', ');
    }

    if (!fields.paymentStatus) {
      fields.paymentStatus = 'open';
    }

    return fields;
  };

  const applySmartFillToForm = (current, extracted) => {
    if (!extracted || Object.keys(extracted).length === 0) {
      return current;
    }

    const updated = { ...current };
    const normalizedVatNumber = typeof extracted.vatNumber === 'string'
      ? extracted.vatNumber.replace(/\s+/g, '').toUpperCase()
      : extracted.vatNumber;

    const assignIfEmptyOrDefault = (field, value) => {
      if (value === undefined || value === null || value === '') return;
      const currentValue = current[field];
      const isStringEmpty = typeof currentValue === 'string' && currentValue.trim() === '';
      const isDefaultDate = field === 'date' && (!currentValue || currentValue === todayIso);
      const isDefaultInvoiceDate = (field === 'invoiceDate' || field === 'dueDate') && !currentValue;
      const isDefaultVendorCountry = field === 'vendorCountry' && (!currentValue || currentValue === companyCountry);
      if (!currentValue || isStringEmpty || isDefaultDate || isDefaultInvoiceDate || isDefaultVendorCountry) {
        updated[field] = value;
      }
    };

    assignIfEmptyOrDefault('vendor', extracted.vendor);
    assignIfEmptyOrDefault('invoiceNumber', extracted.invoiceNumber);
    assignIfEmptyOrDefault('invoiceDate', extracted.invoiceDate || extracted.date);
    assignIfEmptyOrDefault('dueDate', extracted.dueDate);
    assignIfEmptyOrDefault('vendorAddress', extracted.vendorAddress);
    assignIfEmptyOrDefault('description', extracted.description);
    assignIfEmptyOrDefault('notes', extracted.notes);
    assignIfEmptyOrDefault('vendorCountry', extracted.vendorCountry);
    assignIfEmptyOrDefault('vatNumber', normalizedVatNumber);
    assignIfEmptyOrDefault('currency', extracted.currency);
    assignIfEmptyOrDefault('chamberOfCommerceNumber', extracted.chamberOfCommerceNumber);
    assignIfEmptyOrDefault('paymentMethod', extracted.paymentMethod);
    assignIfEmptyOrDefault('paymentMethodDetails', extracted.paymentMethodDetails);

    if (extracted.amount && (!current.amount || parseFloat(current.amount) === 0 || current.amount === '0')) {
      updated.amount = extracted.amount;
    }

    if (typeof extracted.btw === 'number' && (!current.btw || current.btw === 0)) {
      updated.btw = extracted.btw;
    }

    if (typeof extracted.reverseCharge === 'boolean') {
      updated.reverseCharge = extracted.reverseCharge;
    }

    if (updated.vendor) {
      updated.vendor = updated.vendor.replace(/\s{2,}/g, ' ').trim();
      if (vendorTextLooksNoisy(updated.vendor) && extracted.vendor && !vendorTextLooksNoisy(extracted.vendor)) {
        updated.vendor = extracted.vendor.trim();
      }
    }

    if (updated.vendorAddress) {
      updated.vendorAddress = updated.vendorAddress
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .filter((part, index, arr) => arr.indexOf(part) === index)
        .join(', ');
    }

    return updated;
  };

  const extractTextFromPDF = async (file, onProgress) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n${pageText}`;

      if (onProgress) {
        onProgress(Math.round((pageNumber / pdf.numPages) * 90) + 10);
      }
    }

    return fullText;
  };

  const extractTextFromImage = async (file, onProgress) => {
    const worker = await createWorker('eng', 1, {
      logger: (message) => {
        if (message.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(message.progress * 100));
        }
      }
    });

    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    return text;
  };

  // Attachments modal state
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [viewingExpense, setViewingExpense] = useState(null);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importedData, setImportedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importType, setImportType] = useState('excel'); // 'excel' or 'ocr'
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const addDocumentMenuRef = useRef(null);
  const [showAddDocumentMenu, setShowAddDocumentMenu] = useState(false);
  const [showAddDocumentIntro, setShowAddDocumentIntro] = useState(false);
  const prepareImportedRows = useCallback((rows = []) => {
    const existingKeys = new Set(
      (expenses || []).map(expense => buildImportKey({
        date: expense.date,
        invoiceDate: expense.invoiceDate,
        vendor: expense.vendor,
        amount: parseFloat(expense.amount),
        invoiceNumber: expense.invoiceNumber
      }))
    );

    return rows.map((row) => {
      const vendor = (row.vendor || '').toString().trim();
      const description = (row.description || vendor || 'Imported expense').toString().trim();
      const parsedAmount = typeof row.amount === 'number'
        ? row.amount
        : parseNumericAmount(String(row.amount || ''));

      const validationErrors = [];
      if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
        validationErrors.push('Amount is missing or invalid.');
      }
      if (!row.date && !row.invoiceDate) {
        validationErrors.push('Date is missing.');
      }
      if (!vendor) {
        validationErrors.push('Vendor is missing.');
      }

      const dedupeKey = validationErrors.length === 0
        ? buildImportKey({
          date: row.date,
          invoiceDate: row.invoiceDate,
          vendor,
          amount: parsedAmount,
          invoiceNumber: row.invoiceNumber
        })
        : null;

      const isDuplicate = Boolean(dedupeKey && existingKeys.has(dedupeKey));

      return {
        ...row,
        vendor,
        description,
        parsedAmount,
        validationErrors,
        dedupeKey,
        isDuplicate
      };
    });
  }, [expenses]);
  const importDiagnostics = useMemo(() => {
    if (!Array.isArray(importedData) || importedData.length === 0) {
      return { total: 0, duplicates: 0, errors: 0, ready: 0, errorRows: [] };
    }
    const diagnostics = importedData.reduce((acc, row) => {
      if (row?.validationErrors?.length) {
        acc.errors += 1;
        acc.errorRows.push({
          rowIndex: row.rowIndex,
          issues: row.validationErrors
        });
      } else if (row?.isDuplicate) {
        acc.duplicates += 1;
      } else {
        acc.ready += 1;
      }
      return acc;
    }, {
      total: importedData.length,
      duplicates: 0,
      errors: 0,
      ready: 0,
      errorRows: []
    });
    return diagnostics;
  }, [importedData]);

  useEffect(() => {
    if (!showAddDocumentMenu) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (addDocumentMenuRef.current && !addDocumentMenuRef.current.contains(event.target)) {
        setShowAddDocumentMenu(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setShowAddDocumentMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showAddDocumentMenu]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (showAddExpense && !editingExpense) {
      const hasSeen = window.localStorage.getItem(ADD_DOCUMENT_ONBOARDING_KEY);
      if (!hasSeen) {
        setShowAddDocumentIntro(true);
        trackEvent('add_document_onboarding_shown', {
          context: 'expense_modal'
        });
      }
    } else {
      setShowAddDocumentIntro(false);
    }
  }, [showAddExpense, editingExpense]);

  const completeAddDocumentOnboarding = (reason = 'dismissed') => {
    let alreadyCompleted = false;
    if (typeof window !== 'undefined') {
      alreadyCompleted = window.localStorage.getItem(ADD_DOCUMENT_ONBOARDING_KEY) === 'true';
      window.localStorage.setItem(ADD_DOCUMENT_ONBOARDING_KEY, 'true');
    }
    setShowAddDocumentIntro(false);
    if (!alreadyCompleted) {
      trackEvent('add_document_onboarding_completed', {
        context: 'expense_modal',
        reason
      });
    }
  };

  const resetFormState = () => {
    setFormData({
      date: todayIso,
      invoiceDate: '',
      dueDate: '',
      scheduledPaymentDate: '',
      paidDate: '',
      category: 'Subscriptions',
      currency: 'EUR',
      vendor: '',
      vendorAddress: '',
      vendorCountry: companyCountry,
      invoiceNumber: '',
      vatNumber: '',
      chamberOfCommerceNumber: '',
      description: '',
      amount: '',
      btw: 21,
      reverseCharge: false,
      bankAccount: 'Business Checking',
      financialAccountId: '',
      paymentMethod: 'Debit Card',
      paymentMethodDetails: '',
      documentType: 'invoice',
      paymentStatus: 'open',
      approvalStatus: 'draft',
      approvalNotes: '',
      approvalRequestedAt: '',
      approvedAt: '',
      approvalAssigneeId: '',
      approvalChecklist: [{ title: 'Verify invoice', status: 'pending', completedAt: null }],
      lastApprovalReminderAt: '',
      contractId: '',
      contractName: '',
      contractVendorId: '',
      contractSnapshot: null,
      contractReference: '',
      contractUrl: '',
      paymentScheduleNotes: '',
      vatValidationStatus: 'idle',
      vatValidatedAt: '',
      notes: ''
    });
    setVatValidationState({
      status: 'idle',
      message: '',
      lastChecked: null
    });
    setSelectedFiles([]);
    setExistingAttachments([]);
    setCurrentPreviewId(null);
    setZoomLevel(DEFAULT_ZOOM);
    setUploadProgress(0);
    setLastAutoFilledFile(null);
    setUploadingFiles(false);
    resetAutoFillState();
    setShowAddDocumentMenu(false);
    lastMatchedVendorProfileRef.current = null;
    setFormError('');
  };

  const handleCloseModal = (reason = 'close_button') => {
    if (!showAddExpense) return;
    resetFormState();
    setEditingExpense(null);
    setShowAddExpense(false);
    trackEvent('add_document_cancelled', {
      context: 'expense_modal',
      reason,
      wasEditing: Boolean(editingExpense),
      companyId: currentCompanyId || 'unknown'
    });
  };

  // Removed problematic useEffect that was closing modal incorrectly
  // Modal closing is now handled by handleCloseModal function only

  useEffect(() => {
    let isMounted = true;
    if (!currentCompanyId) {
      setFinancialAccounts([]);
      setFinancialAccountsError('');
      return () => {
        isMounted = false;
      };
    }

    const fetchAccounts = async () => {
      try {
        setFinancialAccountsLoading(true);
        setFinancialAccountsError('');
        const accounts = await getCompanyFinancialAccounts(currentCompanyId);
        if (isMounted) {
          setFinancialAccounts(accounts);
        }
      } catch (error) {
        console.error('Failed to load financial accounts:', error);
        if (isMounted) {
          setFinancialAccountsError('Unable to load financial accounts.');
          setFinancialAccounts([]);
        }
      } finally {
        if (isMounted) {
          setFinancialAccountsLoading(false);
        }
      }
    };

    fetchAccounts();

    return () => {
      isMounted = false;
    };
  }, [currentCompanyId]);

  useEffect(() => {
    let isMounted = true;
    if (!currentCompanyId) {
      setContracts([]);
      setContractsError('');
      return () => {
        isMounted = false;
      };
    }

    const fetchContracts = async () => {
      try {
        setContractsLoading(true);
        setContractsError('');
        const list = await getCompanyContracts(currentCompanyId);
        if (isMounted) {
          setContracts(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        console.error('Failed to load contracts:', error);
        if (isMounted) {
          setContractsError('Unable to load contracts.');
          setContracts([]);
        }
      } finally {
        if (isMounted) {
          setContractsLoading(false);
        }
      }
    };

    fetchContracts();

    return () => {
      isMounted = false;
    };
  }, [currentCompanyId]);

  useEffect(() => {
    let isMounted = true;
    if (!currentCompanyId) {
      setCompanyMembers([]);
      return () => {
        isMounted = false;
      };
    }

    const fetchMembers = async () => {
      try {
        setMembersLoading(true);
        const members = await getCompanyMembers(currentCompanyId);
        if (isMounted) {
          setCompanyMembers(Array.isArray(members) ? members : []);
        }
      } catch (error) {
        console.error('Failed to load company members:', error);
        if (isMounted) {
          setCompanyMembers([]);
        }
      } finally {
        if (isMounted) {
          setMembersLoading(false);
        }
      }
    };

    fetchMembers();

    return () => {
      isMounted = false;
    };
  }, [currentCompanyId]);

  // Track last loaded company to prevent unnecessary reloads
  const lastLoadedCompanyIdRef = useRef(null);
  const conversionRateCacheRef = useRef(new Map());

  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    financialAccountId: 'all',
    paymentMethod: 'all',
    vendor: 'all',
    documentType: 'all',
    paymentStatus: 'all',
    approvalStatus: 'all',
    periodType: 'all', // 'all', 'today', 'week', 'month', 'year', 'custom'
    startDate: '',
    endDate: ''
  });
  const [userProfiles, setUserProfiles] = useState({});
  const loadedUserIdsRef = useRef(new Set());
  const [expandedLinkedReceipts, setExpandedLinkedReceipts] = useState(() => new Set());
  const [vendorProfiles, setVendorProfiles] = useState([]);
  const vendorSubscriptionRef = useRef(null);
  const vendorLookupRef = useRef({
    byNormalizedName: new Map(),
    invoiceToVendor: new Map(),
    tokenToVendors: new Map()
  });
  const lastMatchedVendorProfileRef = useRef(null);
  const lastConversionErrorsRef = useRef([]);
  const lastUsedFinancialAccountRef = useRef('');
  const updateVendorLookup = useCallback((profiles = []) => {
    const byNormalizedName = new Map();
    const invoiceToVendor = new Map();
    const tokenToVendors = new Map();

    const registerToken = (token, profile) => {
      if (!token || !profile) return;
      const normalizedToken = token.toString().toLowerCase().trim();
      if (!normalizedToken) return;
      const existing = tokenToVendors.get(normalizedToken);
      if (existing) {
        if (!existing.some(item => item.id === profile.id)) {
          existing.push(profile);
        }
      } else {
        tokenToVendors.set(normalizedToken, [profile]);
      }
    };

    profiles.forEach(profile => {
      if (!profile) return;

      const normalizedName = profile.normalizedName || normalizeVendorName(profile.name || '');
      if (normalizedName) {
        const existingProfile = byNormalizedName.get(normalizedName);
        if (!existingProfile || (profile.usageCount || 0) >= (existingProfile.usageCount || 0)) {
          byNormalizedName.set(normalizedName, profile);
        }

        tokenizeVendorName(normalizedName).forEach(token => registerToken(token, profile));
      }

      const nameHistory = Array.isArray(profile.nameHistory) ? profile.nameHistory : [];
      nameHistory.forEach(historyName => {
        tokenizeVendorName(historyName).forEach(token => registerToken(token, profile));
      });

      const searchTokens = Array.isArray(profile.searchTokens) ? profile.searchTokens : [];
      searchTokens.forEach(token => registerToken(token, profile));

      const invoiceNumbers = Array.isArray(profile.invoiceNumbers) ? profile.invoiceNumbers : [];
      invoiceNumbers.forEach(invoice => {
        const normalizedInvoice = normalizeInvoiceNumber(invoice);
        if (!normalizedInvoice) return;
        const existingInvoiceProfile = invoiceToVendor.get(normalizedInvoice);
        if (!existingInvoiceProfile || (profile.usageCount || 0) >= (existingInvoiceProfile.usageCount || 0)) {
          invoiceToVendor.set(normalizedInvoice, profile);
        }
      });

      if (profile.lastInvoiceNumber) {
        const normalizedInvoice = normalizeInvoiceNumber(profile.lastInvoiceNumber);
        if (normalizedInvoice && !invoiceToVendor.has(normalizedInvoice)) {
          invoiceToVendor.set(normalizedInvoice, profile);
        }
      }
    });

    vendorLookupRef.current = { byNormalizedName, invoiceToVendor, tokenToVendors };
  }, []);

  const findVendorProfileMatch = useCallback((details = {}) => {
    if (!details) return null;

    const normalizedVendor = normalizeVendorName(details.vendor || details.vendorName || '');
    const normalizedInvoice = normalizeInvoiceNumber(details.invoiceNumber || details.referenceNumber || '');
    const lookup = vendorLookupRef.current || {};

    if (normalizedInvoice && lookup.invoiceToVendor?.get(normalizedInvoice)) {
      return lookup.invoiceToVendor.get(normalizedInvoice);
    }

    const candidates = new Map();
    const considerProfile = (profile, baseScore = 0) => {
      if (!profile) return;
      const key = profile.id || profile.normalizedName || profile.name;
      if (!key) return;
      const existing = candidates.get(key);
      if (existing) {
        existing.baseScore = Math.max(existing.baseScore, baseScore);
      } else {
        candidates.set(key, { profile, baseScore });
      }
    };

    if (normalizedVendor && lookup.byNormalizedName?.get(normalizedVendor)) {
      considerProfile(lookup.byNormalizedName.get(normalizedVendor), 60);
    }

    const candidateTokens = tokenizeVendorName(details.vendor || details.vendorName || '');
    if (candidateTokens.length > 0 && lookup.tokenToVendors) {
      candidateTokens.forEach(token => {
        const matches = lookup.tokenToVendors.get(token.toLowerCase());
        if (matches && matches.length) {
          matches.forEach(profile => considerProfile(profile, 20));
        }
      });
    }

    if (normalizedInvoice && vendorProfiles.length > 0) {
      vendorProfiles.forEach(profile => {
        if (!profile) return;
        if (
          (Array.isArray(profile.invoiceNumbers) && profile.invoiceNumbers.some(num => normalizeInvoiceNumber(num) === normalizedInvoice)) ||
          (profile.lastInvoiceNumber && normalizeInvoiceNumber(profile.lastInvoiceNumber) === normalizedInvoice)
        ) {
          considerProfile(profile, 40);
        }
      });
    }

    if (!normalizedVendor && candidates.size === 0 && vendorProfiles.length === 1) {
      considerProfile(vendorProfiles[0], 30);
    }

    let bestProfile = null;
    let bestScore = 0;

    candidates.forEach(({ profile, baseScore }) => {
      const totalScore = baseScore + computeVendorMatchScore(profile, details, normalizedVendor, normalizedInvoice);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestProfile = profile;
      }
    });

    const threshold = normalizedInvoice ? 50 : 60;
    return bestScore >= threshold ? bestProfile : null;
  }, [vendorProfiles]);

  const enrichWithVendorProfile = useCallback((extracted = {}, currentForm = {}) => {
    if (!extracted) {
      return { fields: extracted, match: null };
    }

    const candidateDetails = {
      ...extracted,
      vendor: extracted.vendor || currentForm.vendor || '',
      vendorName: extracted.vendor || currentForm.vendor || '',
      vendorCountry: extracted.vendorCountry || currentForm.vendorCountry || '',
      invoiceNumber: extracted.invoiceNumber || currentForm.invoiceNumber || '',
      referenceNumber: extracted.invoiceNumber || currentForm.invoiceNumber || '',
      currency: extracted.currency || currentForm.currency || '',
      vendorAddress: extracted.vendorAddress || currentForm.vendorAddress || ''
    };

    const matchedProfile = findVendorProfileMatch(candidateDetails);
    if (!matchedProfile) {
      return { fields: extracted, match: null };
    }

    const nextFields = { ...extracted };
    const profileVendorName = matchedProfile.name || matchedProfile.displayName || matchedProfile.normalizedName;
    if (profileVendorName) {
      if (!nextFields.vendor || vendorTextLooksNoisy(nextFields.vendor)) {
        nextFields.vendor = profileVendorName;
      } else {
        const existingNormalized = normalizeVendorName(nextFields.vendor);
        const profileNormalized = normalizeVendorName(profileVendorName);
        if (
          existingNormalized &&
          profileNormalized &&
          existingNormalized !== profileNormalized &&
          vendorTextLooksNoisy(nextFields.vendor)
        ) {
          nextFields.vendor = profileVendorName;
        }
      }
    }

    const profileAddress = matchedProfile.primaryAddress
      || (Array.isArray(matchedProfile.addresses) ? matchedProfile.addresses[0] : '');
    if (profileAddress) {
      if (!nextFields.vendorAddress || vendorAddressNeedsAssistance(nextFields.vendorAddress)) {
        nextFields.vendorAddress = profileAddress;
      }
    }

    const profileCountry = matchedProfile.country
      || (Array.isArray(matchedProfile.countries) ? matchedProfile.countries[0] : '');
    if (profileCountry && !nextFields.vendorCountry) {
      nextFields.vendorCountry = profileCountry;
    }

    const profileCurrency = matchedProfile.preferredCurrency
      || (Array.isArray(matchedProfile.currencies) ? matchedProfile.currencies[0] : '');
    if (profileCurrency && !nextFields.currency) {
      nextFields.currency = profileCurrency;
    }

    if (!nextFields.vatNumber && matchedProfile.primaryVatNumber) {
      nextFields.vatNumber = matchedProfile.primaryVatNumber;
    }

    if (!nextFields.chamberOfCommerceNumber && matchedProfile.primaryChamberOfCommerceNumber) {
      nextFields.chamberOfCommerceNumber = matchedProfile.primaryChamberOfCommerceNumber;
    }

    if (!nextFields.paymentMethod && matchedProfile.defaultPaymentMethod) {
      nextFields.paymentMethod = matchedProfile.defaultPaymentMethod;
    }

    if (!nextFields.paymentMethodDetails && matchedProfile.defaultPaymentMethodDetails) {
      nextFields.paymentMethodDetails = matchedProfile.defaultPaymentMethodDetails;
    }

    if (!nextFields.vendorAddress && profileAddress) {
      nextFields.vendorAddress = profileAddress;
    }

    return {
      fields: nextFields,
      match: matchedProfile
    };
  }, [findVendorProfileMatch]);

  useEffect(() => {
    if (selectedFiles.length === 0) {
      resetAutoFillState();
      setLastAutoFilledFile(null);
      return;
    }

    const latestFile = selectedFiles[selectedFiles.length - 1];
    if (!latestFile) return;

    const signature = getFileSignature(latestFile);
    if (signature === lastAutoFilledFile && autoFillStatus === 'success') {
      return;
    }

    let isCancelled = false;
    let successTimeout;

    const runSmartFill = async () => {
      try {
        setAutoFillStatus('processing');
        setAutoFillMessage('Smart fill: analyzing document...');
        setAutoFillProgress(5);

        let extractedText = '';

        if (latestFile.type === 'application/pdf') {
          extractedText = await extractTextFromPDF(latestFile, (progress) => {
            if (!isCancelled) {
              setAutoFillProgress(progress);
            }
          });
        } else if (latestFile.type.startsWith('image/')) {
          extractedText = await extractTextFromImage(latestFile, (progress) => {
            if (!isCancelled) {
              setAutoFillProgress(progress);
            }
          });
        } else {
          if (!isCancelled) {
            setAutoFillStatus('error');
            setAutoFillMessage('Smart fill currently supports PDF, PNG, and JPG files.');
            setAutoFillProgress(0);
            successTimeout = setTimeout(() => {
              if (!isCancelled) {
                resetAutoFillState();
              }
            }, 6000);
          }
          return;
        }

        if (isCancelled) {
          return;
        }

        const extractedFields = parseExpenseDetailsFromText(extractedText);

        if (!extractedFields || Object.keys(extractedFields).length === 0) {
          setAutoFillStatus('error');
          setAutoFillMessage('Smart fill could not detect any data. Please enter the details manually.');
          setAutoFillProgress(0);
          successTimeout = setTimeout(() => {
            if (!isCancelled) {
              resetAutoFillState();
            }
          }, 6000);
          return;
        }
        let matchedVendorProfileName = null;
        setFormData(prev => {
          const { fields, match } = enrichWithVendorProfile(extractedFields, prev);
          if (match) {
            lastMatchedVendorProfileRef.current = match;
            matchedVendorProfileName = match.displayName || match.name || match.normalizedName || null;
          } else {
            lastMatchedVendorProfileRef.current = null;
          }
          return applySmartFillToForm(prev, fields);
        });
        setAutoFillStatus('success');
        setAutoFillMessage(
          matchedVendorProfileName
            ? `Smart fill matched saved provider ${matchedVendorProfileName}. Review the detected values.`
            : 'Smart fill applied. Please verify the details before saving.'
        );
        setAutoFillProgress(100);
        setLastAutoFilledFile(signature);

        successTimeout = setTimeout(() => {
          if (!isCancelled) {
            resetAutoFillState();
          }
        }, 6000);
      } catch (error) {
        console.error('Smart fill error:', error);
        if (!isCancelled) {
          setAutoFillStatus('error');
          setAutoFillMessage('Smart fill failed. Please review the document manually.');
          setAutoFillProgress(0);
          successTimeout = setTimeout(() => {
            if (!isCancelled) {
              resetAutoFillState();
            }
          }, 6000);
        }
      }
    };

    runSmartFill();

    return () => {
      isCancelled = true;
      if (successTimeout) {
        clearTimeout(successTimeout);
      }
    };
  }, [selectedFiles, lastAutoFilledFile, enrichWithVendorProfile]);

  // Form State
  const [formData, setFormData] = useState({
    date: todayIso,
    invoiceDate: '',
    dueDate: '',
    scheduledPaymentDate: '',
    paidDate: '',
    category: 'Subscriptions',
    currency: 'EUR',
    vendor: '',
    vendorAddress: '',
    vendorCountry: companyCountry,
    invoiceNumber: '',
    vatNumber: '',
    chamberOfCommerceNumber: '',
    description: '',
    amount: '',
    btw: 21,
    reverseCharge: false,
    bankAccount: 'Business Checking',
    financialAccountId: '',
    paymentMethod: 'Debit Card',
    paymentMethodDetails: '',
    documentType: 'invoice',
    paymentStatus: 'open',
    approvalStatus: 'draft',
    approvalNotes: '',
    approvalRequestedAt: '',
    approvedAt: '',
    approvalAssigneeId: '',
    approvalChecklist: [{ title: 'Verify invoice', status: 'pending', completedAt: null }],
    lastApprovalReminderAt: '',
    contractId: '',
    contractName: '',
    contractVendorId: '',
    contractSnapshot: null,
    contractReference: '',
    contractUrl: '',
    paymentScheduleNotes: '',
    vatValidationStatus: 'idle',
    vatValidatedAt: '',
    notes: ''
  });
  const [vatValidationState, setVatValidationState] = useState({
    status: 'idle',
    message: '',
    lastChecked: null
  });

  const previousPaymentStatusRef = useRef(formData.paymentStatus);
  const previousApprovalStatusRef = useRef(formData.approvalStatus);

  useEffect(() => {
    if (previousPaymentStatusRef.current === 'paid' && formData.paymentStatus !== 'paid') {
      setFormData(prev => ({
        ...prev,
        paymentMethodDetails: '',
        paidDate: ''
      }));
    }
    if (formData.paymentStatus === 'paid' && !formData.paidDate) {
      setFormData(prev => ({
        ...prev,
        paidDate: todayIso
      }));
    }
    previousPaymentStatusRef.current = formData.paymentStatus;
  }, [formData.paymentStatus]);

  useEffect(() => {
    const previousStatus = previousApprovalStatusRef.current;
    const currentStatus = formData.approvalStatus;
    if (previousStatus !== currentStatus) {
      setFormData(prev => {
        const updates = {};
        if (currentStatus === 'approved' && !prev.approvedAt) {
          updates.approvedAt = new Date().toISOString();
        }
        if (previousStatus === 'approved' && currentStatus !== 'approved' && prev.approvedAt) {
          updates.approvedAt = '';
        }
        if (currentStatus === 'awaiting' && !prev.approvalRequestedAt) {
          updates.approvalRequestedAt = new Date().toISOString();
        }
        if (!Array.isArray(prev.approvalChecklist) || prev.approvalChecklist.length === 0) {
          updates.approvalChecklist = [{ title: 'Verify invoice', status: 'pending', completedAt: null }];
        }
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
    previousApprovalStatusRef.current = currentStatus;
  }, [formData.approvalStatus]);

  const paymentSectionVisible = formData.paymentStatus === 'paid';

  // Load expenses from Firebase when component mounts or company changes
  useEffect(() => {
    if (!currentUser || !currentCompanyId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    
    // Only reload if company ID actually changed
    if (lastLoadedCompanyIdRef.current !== currentCompanyId) {
      console.log(`[ExpenseTracker] Loading expenses for company: ${currentCompanyId}`);
      lastLoadedCompanyIdRef.current = currentCompanyId;
      // Don't block render - load data asynchronously
      loadExpenses();
    }
  }, [currentUser, currentCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (vendorSubscriptionRef.current) {
      vendorSubscriptionRef.current();
      vendorSubscriptionRef.current = null;
    }

    if (!currentCompanyId) {
      setVendorProfiles([]);
      vendorLookupRef.current = {
        byNormalizedName: new Map(),
        invoiceToVendor: new Map(),
        tokenToVendors: new Map()
      };
      return undefined;
    }

    vendorSubscriptionRef.current = subscribeToCompanyVendors(currentCompanyId, (profiles = []) => {
      const sorted = [...profiles].sort((a, b) => (b?.usageCount || 0) - (a?.usageCount || 0));
      setVendorProfiles(sorted);
      updateVendorLookup(sorted);
    });

    return () => {
      if (vendorSubscriptionRef.current) {
        vendorSubscriptionRef.current();
        vendorSubscriptionRef.current = null;
      }
    };
  }, [currentCompanyId, updateVendorLookup]);

  useEffect(() => {
    if (!editingExpense) {
      setFormData(prev => ({
        ...prev,
        vendorCountry: prev.vendorCountry || companyCountry
      }));
    }
  }, [companyCountry, editingExpense]);

  useEffect(() => {
    if (formData.vendorCountry && formData.vendorCountry !== 'OTHER' && formData.vendorCountry === companyCountry && formData.reverseCharge) {
      setFormData(prev => ({
        ...prev,
        reverseCharge: false
      }));
    }
  }, [formData.vendorCountry, companyCountry, formData.reverseCharge]);

  const toggleLinkedReceipt = useCallback((receiptId) => {
    setExpandedLinkedReceipts(prev => {
      const next = new Set(prev);
      if (next.has(receiptId)) {
        next.delete(receiptId);
      } else {
        next.add(receiptId);
      }
      return next;
    });
  }, []);

  const reconcileInvoicesWithReceipts = useCallback(async (expensesList = []) => {
    if (!currentCompanyId || !Array.isArray(expensesList) || expensesList.length === 0) {
      return expensesList;
    }

    const normalizeKey = (value) => (value ? value.toString().trim().toLowerCase() : '');
    const normalizeText = (value) => (value ? value.toString().trim().toLowerCase() : '');
    const parseAmountValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parseFloat(parsed.toFixed(2)) : null;
    };

    const receipts = expensesList.filter((expense) => (
      (expense.documentType || '').toLowerCase() === 'receipt'
      && (expense.paymentStatus || '').toLowerCase() === 'paid'
      && Boolean(expense.invoiceNumber)
    ));

    if (receipts.length === 0) {
      return expensesList;
    }

    const invoicesByInvoiceNumber = new Map();
    const expenseIndexById = new Map();
    const updatedExpenses = expensesList.map((expense, index) => {
      expenseIndexById.set(expense.id, index);
      if ((expense.documentType || '').toLowerCase() === 'invoice' && expense.invoiceNumber) {
        const key = normalizeKey(expense.invoiceNumber);
        if (key) {
          if (!invoicesByInvoiceNumber.has(key)) {
            invoicesByInvoiceNumber.set(key, []);
          }
          invoicesByInvoiceNumber.get(key).push(expense);
        }
      }
      return { ...expense };
    });

    const reconciledInvoiceIds = new Set();

    for (const receipt of receipts) {
      const receiptKey = normalizeKey(receipt.invoiceNumber);
      if (!receiptKey || !invoicesByInvoiceNumber.has(receiptKey)) {
        continue;
      }

      const candidateInvoices = invoicesByInvoiceNumber.get(receiptKey).filter((invoice) => (
        (invoice.paymentStatus || '').toLowerCase() !== 'paid'
        && !reconciledInvoiceIds.has(invoice.id)
      ));

      if (candidateInvoices.length === 0) {
        continue;
      }

      const receiptAmount = parseAmountValue(receipt.amount);
      const receiptVendor = normalizeText(receipt.vendor);
      const receiptCurrency = (receipt.currency || '').toUpperCase();

      const invoiceToUpdate = candidateInvoices.find((invoice) => {
        const invoiceAmount = parseAmountValue(invoice.amount);
        const invoiceVendor = normalizeText(invoice.vendor);
        const invoiceCurrency = (invoice.currency || '').toUpperCase();

        const amountMatches = invoiceAmount !== null && receiptAmount !== null
          ? Math.abs(invoiceAmount - receiptAmount) < 0.01
          : true;
        const vendorMatches = receiptVendor && invoiceVendor
          ? receiptVendor === invoiceVendor
          : true;
        const currencyMatches = receiptCurrency && invoiceCurrency
          ? receiptCurrency === invoiceCurrency
          : true;

        return amountMatches && vendorMatches && currencyMatches;
      }) || candidateInvoices[0];

      if (!invoiceToUpdate) {
        continue;
      }

      const updatePayload = {
        paymentStatus: 'paid',
        linkedPaymentExpenseId: receipt.id,
        linkedPaymentInvoiceNumber: receipt.invoiceNumber || '',
        linkedPaymentRecordedAt: new Date().toISOString(),
        linkedPaymentRecordedBy: currentUser?.uid || 'system-auto'
      };

      if (!invoiceToUpdate.financialAccountId && receipt.financialAccountId) {
        updatePayload.financialAccountId = receipt.financialAccountId;
      }
      if (!invoiceToUpdate.paymentMethod && receipt.paymentMethod) {
        updatePayload.paymentMethod = receipt.paymentMethod;
      }
      if (!invoiceToUpdate.paymentMethodDetails && receipt.paymentMethodDetails) {
        updatePayload.paymentMethodDetails = receipt.paymentMethodDetails;
      }

      try {
        await updateCompanyExpense(currentCompanyId, invoiceToUpdate.id, updatePayload);

        const receiptUpdatePayload = {
          linkedInvoiceExpenseId: invoiceToUpdate.id,
          linkedInvoiceNumber: invoiceToUpdate.invoiceNumber || '',
          linkedInvoiceUpdatedAt: new Date().toISOString(),
          linkedInvoiceLinkedBy: currentUser?.uid || 'system-auto'
        };

        if (receipt.linkedInvoiceExpenseId !== invoiceToUpdate.id) {
          await updateCompanyExpense(currentCompanyId, receipt.id, receiptUpdatePayload);
        }

        trackEvent('invoice_auto_reconciled', {
          invoiceId: invoiceToUpdate.id,
          receiptId: receipt.id,
          invoiceNumber: receipt.invoiceNumber || '',
          amount: parseAmountValue(invoiceToUpdate.amount) ?? parseAmountValue(receipt.amount) ?? null,
          currency: receiptCurrency || (invoiceToUpdate.currency || ''),
          companyId: currentCompanyId
        });

        const invoiceIndex = expenseIndexById.get(invoiceToUpdate.id);
        if (typeof invoiceIndex === 'number') {
          updatedExpenses[invoiceIndex] = {
            ...updatedExpenses[invoiceIndex],
            ...updatePayload
          };
        }

        const receiptIndex = expenseIndexById.get(receipt.id);
        if (typeof receiptIndex === 'number') {
          updatedExpenses[receiptIndex] = {
            ...updatedExpenses[receiptIndex],
            ...receiptUpdatePayload
          };
        }

        reconciledInvoiceIds.add(invoiceToUpdate.id);
      } catch (error) {
        console.error('Failed to auto-reconcile invoice', invoiceToUpdate.id, error);
      }
    }

    return reconciledInvoiceIds.size > 0 ? updatedExpenses : expensesList;
  }, [currentCompanyId, currentUser?.uid]);

  const reconcileReceiptsWithStatements = useCallback(async (expensesList = []) => {
    if (!currentCompanyId || !Array.isArray(expensesList) || expensesList.length === 0) {
      return expensesList;
    }

    const parseAmountValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parseFloat(parsed.toFixed(2)) : null;
    };

    const receipts = expensesList.filter((expense) => (
      (expense.documentType || '').toLowerCase() === 'receipt'
      && (expense.paymentStatus || '').toLowerCase() === 'paid'
    ));

    if (receipts.length === 0) {
      return expensesList;
    }

    const statements = expensesList.filter((expense) => (
      (expense.documentType || '').toLowerCase() === 'statement'
    ));

    if (statements.length === 0) {
      return expensesList;
    }

    const statementIndexById = new Map();
    const expenseIndexById = new Map();
    const updatedExpenses = expensesList.map((expense, index) => {
      expenseIndexById.set(expense.id, index);
      if ((expense.documentType || '').toLowerCase() === 'statement') {
        statementIndexById.set(expense.id, expense);
      }
      return { ...expense };
    });

    const availableStatements = statements.filter((statement) => {
      const alreadyLinked = Boolean(statement.linkedReceiptExpenseId);
      return alreadyLinked ? false : true;
    });

    if (availableStatements.length === 0) {
      return expensesList;
    }

    const matchedStatementIds = new Set();

    const normaliseString = (value) => (value ? value.toString().toLowerCase().replace(/\s+/g, ' ').trim() : '');
    const toDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      if (value?.toDate) {
        try {
          const parsed = value.toDate();
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        } catch {
          return null;
        }
      }
      if (value?.seconds) {
        const parsed = new Date(value.seconds * 1000);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      return null;
    };
    const differenceInDays = (dateA, dateB) => {
      const a = toDate(dateA);
      const b = toDate(dateB);
      if (!a || !b) return Number.POSITIVE_INFINITY;
      const diff = Math.abs(a.getTime() - b.getTime());
      return diff / (1000 * 60 * 60 * 24);
    };

    for (const receipt of receipts) {
      if (receipt.linkedStatementExpenseId && statementIndexById.has(receipt.linkedStatementExpenseId)) {
        continue;
      }

      const receiptAmount = parseAmountValue(receipt.amount);
      if (receiptAmount === null || receiptAmount <= 0) {
        continue;
      }

      const receiptMethod = normaliseString(receipt.paymentMethodDetails || receipt.paymentMethod);
      const receiptVendor = normaliseString(receipt.vendor);

      const candidateStatements = availableStatements.filter((statement) => {
        if (matchedStatementIds.has(statement.id)) return false;
        const statementAmount = parseAmountValue(statement.amount);
        if (statementAmount === null || statementAmount <= 0) return false;

        const amountMatches = Math.abs(statementAmount - receiptAmount) < 0.02;
        if (!amountMatches) return false;

        const statementMethod = normaliseString(statement.paymentMethodDetails || statement.paymentMethod);
        const statementVendor = normaliseString(statement.vendor || statement.description);

        const methodMatches = receiptMethod && statementMethod
          ? statementMethod.includes(receiptMethod) || receiptMethod.includes(statementMethod)
          : false;
        const vendorMatches = receiptVendor && statementVendor
          ? statementVendor.includes(receiptVendor) || receiptVendor.includes(statementVendor)
          : false;

        const dayDiff = differenceInDays(receipt.date, statement.date);
        const dateMatches = dayDiff <= 5;

        return amountMatches && (methodMatches || vendorMatches || dateMatches);
      });

      if (candidateStatements.length === 0) {
        continue;
      }

      const statement = candidateStatements.sort((a, b) => {
        const diffA = differenceInDays(receipt.date, a.date);
        const diffB = differenceInDays(receipt.date, b.date);
        return diffA - diffB;
      })[0];

      const statementAmount = parseAmountValue(statement.amount) ?? receiptAmount;
      const dayDifference = differenceInDays(receipt.date, statement.date);
      const methodMatches = normaliseString(statement.paymentMethodDetails || statement.paymentMethod)
        && normaliseString(receipt.paymentMethodDetails || receipt.paymentMethod)
        && (normaliseString(statement.paymentMethodDetails || statement.paymentMethod).includes(normaliseString(receipt.paymentMethodDetails || receipt.paymentMethod))
          || normaliseString(receipt.paymentMethodDetails || receipt.paymentMethod).includes(normaliseString(statement.paymentMethodDetails || statement.paymentMethod)));
      const vendorMatches = normaliseString(statement.vendor || statement.description)
        && normaliseString(receipt.vendor)
        && (normaliseString(statement.vendor || statement.description).includes(normaliseString(receipt.vendor))
          || normaliseString(receipt.vendor).includes(normaliseString(statement.vendor || statement.description)));

      let confidence = 0.4; // base for amount match
      if (methodMatches) confidence += 0.3;
      if (vendorMatches) confidence += 0.2;
      if (dayDifference <= 1) confidence += 0.2;
      else if (dayDifference <= 3) confidence += 0.1;
      confidence = Math.min(0.95, confidence);

      const nowIso = new Date().toISOString();
      const receiptUpdate = {
        linkedStatementExpenseId: statement.id,
        linkedStatementMatchedAt: nowIso,
        linkedStatementMatchedBy: currentUser?.uid || 'system-auto',
        linkedStatementMatchConfidence: confidence,
        linkedStatementAmount: statementAmount,
        linkedStatementDate: statement.date || '',
        linkedStatementDescription: statement.description || ''
      };

      const statementUpdate = {
        linkedReceiptExpenseId: receipt.id,
        linkedReceiptMatchedAt: nowIso,
        linkedReceiptMatchConfidence: confidence,
        linkedReceiptInvoiceNumber: receipt.invoiceNumber || '',
        linkedReceiptVendor: receipt.vendor || '',
        linkedReceiptAmount: receiptAmount,
        linkedReceiptDate: receipt.date || ''
      };

      try {
        await Promise.all([
          updateCompanyExpense(currentCompanyId, receipt.id, receiptUpdate),
          updateCompanyExpense(currentCompanyId, statement.id, statementUpdate)
        ]);

        const receiptIndex = expenseIndexById.get(receipt.id);
        if (typeof receiptIndex === 'number') {
          updatedExpenses[receiptIndex] = {
            ...updatedExpenses[receiptIndex],
            ...receiptUpdate
          };
        }

        const statementIndex = expenseIndexById.get(statement.id);
        if (typeof statementIndex === 'number') {
          updatedExpenses[statementIndex] = {
            ...updatedExpenses[statementIndex],
            ...statementUpdate
          };
        }

        matchedStatementIds.add(statement.id);

        trackEvent('receipt_statement_reconciled', {
          receiptId: receipt.id,
          statementId: statement.id,
          amount: statementAmount,
          daysDelta: Number.isFinite(dayDifference) ? dayDifference : null,
          confidence,
          companyId: currentCompanyId
        });
      } catch (error) {
        console.error('Failed to reconcile receipt with bank statement', { receiptId: receipt.id, statementId: statement.id }, error);
      }
    }

    return matchedStatementIds.size > 0 ? updatedExpenses : expensesList;
  }, [currentCompanyId, currentUser?.uid]);

  const loadExpenses = async () => {
    if (!currentCompanyId) {
      console.warn('No company selected, cannot load expenses');
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const companyExpenses = await getCompanyExpenses(currentCompanyId);
      let reconciledExpenses = await reconcileInvoicesWithReceipts(companyExpenses || []);
      reconciledExpenses = await reconcileReceiptsWithStatements(reconciledExpenses || []);
      setExpenses(reconciledExpenses || []);
      await hydrateUserProfiles(reconciledExpenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    let nextValue = value;

    if (name === 'vendorCountry') {
      nextValue = value ? value.toUpperCase() : '';
    }

    if (name === 'btw') {
      nextValue = Number(value);
    }

    if (type === 'number' && name !== 'btw') {
      nextValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleReverseChargeChange = (e) => {
    const { checked } = e.target;
    setFormData(prev => ({
      ...prev,
      reverseCharge: checked
    }));
  };

  const handleVatValidation = async () => {
    if (!formData.vatNumber) {
      setVatValidationState({
        status: 'error',
        message: 'Please enter a VAT number to validate.',
        lastChecked: null
      });
      return;
    }

    const normalizedVendorCountry = formData.vendorCountry && formData.vendorCountry !== 'OTHER'
      ? formData.vendorCountry.slice(0, 2).toUpperCase()
      : '';
    const vatPrefix = formData.vatNumber.slice(0, 2).toUpperCase();
    const countryForLookup = normalizedVendorCountry || (/[A-Z]{2}/.test(vatPrefix) ? vatPrefix : '');
    if (!countryForLookup || countryForLookup.length !== 2) {
      setVatValidationState({
        status: 'error',
        message: 'Select a vendor country (two-letter code) before validating.',
        lastChecked: null
      });
      return;
    }

    setVatValidationState({
      status: 'loading',
      message: 'Validating VAT number via VIES…',
      lastChecked: null
    });

    try {
      const result = await validateVatNumber(countryForLookup, formData.vatNumber);
    if (!result?.success || !result?.data) {
      setVatValidationState({
        status: 'error',
        message: result?.error || 'VAT validation service is temporarily unavailable. Please try again shortly.',
        lastChecked: null
      });
        return;
      }

      const { data } = result;
      const formattedAddress = data.address ? data.address.replace(/\n+/g, ', ').replace(/\s{2,}/g, ' ').trim() : '';
      const cleanedName = data.name && data.name !== '---' ? data.name : '';
      const vatCountry = (data.countryCode || countryForLookup || '').toUpperCase();
      const existingVatDigits = formData.vatNumber.replace(/^[A-Za-z]{2}/, '');
      const vatDigits = (data.vatNumber || existingVatDigits).toUpperCase();
      const combinedVat = vatCountry && vatDigits ? `${vatCountry}${vatDigits}` : formData.vatNumber.toUpperCase();
      const reverseChargeApplies = data.valid && vatCountry && vatCountry !== companyCountry;

      setFormData(prev => ({
        ...prev,
        vendor: prev.vendor || cleanedName,
        vendorAddress: prev.vendorAddress || formattedAddress,
        vendorCountry: vatCountry || prev.vendorCountry || countryForLookup,
        vatNumber: combinedVat,
        vatValidationStatus: data.valid ? 'valid' : 'invalid',
        vatValidatedAt: data.requestDate || new Date().toISOString(),
        reverseCharge: data.valid ? reverseChargeApplies : false
      }));

      setVatValidationState({
        status: data.valid ? 'success' : 'error',
        message: data.valid ? 'VAT number validated via VIES.' : 'VAT number is invalid according to VIES.',
        lastChecked: data.requestDate || new Date().toISOString()
      });
    } catch (error) {
      console.error('VAT validation failed:', error);
      let friendlyMessage = error?.message || 'VIES validation failed. Please try again later.';
      if (error?.code === 'functions/not-found' || /function.*not found/i.test(friendlyMessage)) {
        friendlyMessage = 'VAT validation function is not deployed yet. Run "firebase deploy --only functions:validateVat" and try again.';
      } else if (/internal/i.test(friendlyMessage)) {
        friendlyMessage = 'VAT validation service is temporarily unavailable. Please retry in a moment.';
      }
      setVatValidationState({
        status: 'error',
        message: friendlyMessage,
        lastChecked: null
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let expenseId;
      setFormError('');
      const payload = {
        ...formData,
        vendorCountry: formData.vendorCountry === 'OTHER' ? '' : formData.vendorCountry
      };

      payload.date = payload.date || todayIso;
      if (!payload.invoiceDate) {
        payload.invoiceDate = payload.date;
      }

      const isMarkedAsPaid = payload.paymentStatus === 'paid';
      if (isMarkedAsPaid && !payload.paidDate) {
        payload.paidDate = todayIso;
      } else if (!isMarkedAsPaid) {
        payload.paidDate = '';
      }

      if (!payload.financialAccountId) {
        const fallbackAccountId = getDefaultExpenseAccountId();
        if (fallbackAccountId) {
          payload.financialAccountId = fallbackAccountId;
          payload.bankAccount = 'Financial Account';
        }
      }

      if (isMarkedAsPaid && !payload.financialAccountId && financialAccounts.length > 0) {
        setFormError('Select a financial account before saving a paid document. You can add new accounts from Settings → Financial Accounts.');
        return;
      }

      setUploadingFiles(true);

      const expensePayload = {
        ...payload,
        financialAccountId: payload.financialAccountId || '',
        paymentMethod: payload.paymentMethod || '',
        paymentMethodDetails: isMarkedAsPaid ? payload.paymentMethodDetails : '',
        paidDate: isMarkedAsPaid ? (payload.paidDate || todayIso) : '',
        contractId: payload.contractId || '',
        contractName: payload.contractName || '',
        contractVendorId: payload.contractVendorId || '',
        contractSnapshot: payload.contractSnapshot ? { ...payload.contractSnapshot } : null,
        approvalAssigneeId: payload.approvalAssigneeId || '',
        approvalChecklist: Array.isArray(payload.approvalChecklist) ? payload.approvalChecklist : [],
        lastApprovalReminderAt: payload.lastApprovalReminderAt || ''
      };

      if (expensePayload.approvalStatus === 'approved' && !expensePayload.approvedAt) {
        expensePayload.approvedAt = new Date().toISOString();
      }
      if (expensePayload.approvalStatus === 'awaiting' && !expensePayload.approvalRequestedAt) {
        expensePayload.approvalRequestedAt = new Date().toISOString();
      }
      if (expensePayload.approvalStatus !== 'approved') {
        expensePayload.approvedAt = '';
      }

      if (!currentCompanyId) {
        alert('Please select a company to add expenses.');
        setUploadingFiles(false);
        return;
      }

      if (editingExpense) {
        // Update existing expense
        expenseId = editingExpense.id;
        await updateCompanyExpense(currentCompanyId, expenseId, {
          ...expensePayload,
          updatedAt: new Date().toISOString()
        });
        
      } else {
        // Add new expense
        expenseId = await addCompanyExpense(currentCompanyId, currentUser.uid, {
          ...expensePayload,
          accountId: currentAccountId,
          createdAt: new Date().toISOString()
        });
      }

      // Upload files if any
      if (selectedFiles.length > 0) {
        const uploadedFiles = [];
        let completedUploads = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          
          const fileMetadata = await uploadExpenseFile(
            currentUser.uid,
            expenseId,
            file,
            (progress) => {
              // Calculate overall progress across all files
              const overallProgress = ((completedUploads + (progress / 100)) / selectedFiles.length) * 100;
              setUploadProgress(overallProgress);
            },
            currentCompanyId // Pass company ID for proper path structure
          );
          
          completedUploads++;
          setUploadProgress((completedUploads / selectedFiles.length) * 100);
          uploadedFiles.push(fileMetadata);
        }

        // Update expense with file metadata
        const priorAttachments = editingExpense
          ? (existingAttachments && existingAttachments.length > 0
            ? existingAttachments
            : (editingExpense.attachments || []))
          : [];
        const mergedAttachments = [...priorAttachments, ...uploadedFiles];
        const uniqueAttachments = mergedAttachments.filter((attachment, index, self) =>
          self.findIndex(item => item.fileUrl === attachment.fileUrl) === index
        );

        await updateCompanyExpense(currentCompanyId, expenseId, {
          attachments: uniqueAttachments,
          updatedAt: new Date().toISOString()
        });
        setExistingAttachments(uniqueAttachments);
      }

      // Reload expenses
      const matchedProfile = (() => {
        const candidate = lastMatchedVendorProfileRef.current;
        if (!candidate) return null;
        const normalizedCandidate = normalizeVendorName(candidate.name || candidate.displayName || candidate.normalizedName || '');
        const normalizedVendor = normalizeVendorName(expensePayload.vendor || '');
        if (normalizedCandidate && normalizedVendor && normalizedCandidate === normalizedVendor) {
          return candidate;
        }
        return null;
      })();
      try {
        if (expensePayload.vendor || expensePayload.invoiceNumber) {
          await upsertCompanyVendorProfile(currentCompanyId, currentUser.uid, {
            name: expensePayload.vendor,
            vendor: expensePayload.vendor,
            vendorAddress: expensePayload.vendorAddress,
            vendorCountry: expensePayload.vendorCountry,
            currency: expensePayload.currency,
            vatNumber: expensePayload.vatNumber,
            chamberOfCommerceNumber: expensePayload.chamberOfCommerceNumber,
            paymentMethod: expensePayload.paymentMethod,
            paymentMethodDetails: expensePayload.paymentMethodDetails,
            invoiceNumber: expensePayload.invoiceNumber,
            invoiceDate: expensePayload.invoiceDate,
            dueDate: expensePayload.dueDate,
            amount: Number.isFinite(newAmount) ? Number(newAmount) : undefined,
            paymentStatus: expensePayload.paymentStatus,
            documentType: expensePayload.documentType,
            notes: expensePayload.notes,
            source: matchedProfile ? 'smart_fill_profile_match' : 'expense_form',
            matchedProfileId: matchedProfile?.id || null
          });
        }
      } catch (vendorError) {
        console.error('Failed to update vendor profile:', vendorError);
      }
      lastMatchedVendorProfileRef.current = null;
      await loadExpenses();

      trackEvent('document_saved', {
        documentType: (payload.documentType || 'invoice').toLowerCase(),
        paymentStatus: (payload.paymentStatus || 'open').toLowerCase(),
        isEdit: Boolean(editingExpense),
        attachmentsUploaded: selectedFiles.length,
        hasExistingAttachments: Boolean(existingAttachments?.length),
        companyId: currentCompanyId || 'unknown'
      });
      completeAddDocumentOnboarding('document_saved');

      resetFormState();
      setShowAddExpense(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      trackEvent('document_save_error', {
        documentType: (formData.documentType || 'invoice').toLowerCase(),
        isEdit: Boolean(editingExpense),
        companyId: currentCompanyId || 'unknown',
        message: error?.message?.slice(0, 120) || 'unknown'
      });
      alert('Error saving expense. Please try again.');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Handle expense deletion
  const handleDeleteExpense = async (expenseId) => {
    if (!currentCompanyId) {
      alert('Please select a company to delete expenses.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteCompanyExpense(currentCompanyId, expenseId);
        await loadExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense. Please try again.');
      }
    }
  };

  const handleAddDocument = (docType = 'invoice', source = 'menu', templateExpense = null) => {
    if (!currentCompanyId) {
      alert('Please select a company to add documents.');
      return;
    }

    const normalizedDocType = (docType || 'invoice').toLowerCase();
    const defaultPaymentStatus = normalizedDocType === 'receipt' ? 'paid' : 'open';

    trackEvent('add_document_opened', {
      documentType: normalizedDocType,
      source,
      companyId: currentCompanyId || 'unknown'
    });

    resetFormState();
    setFormData(prev => {
      const next = {
        ...prev,
        documentType: normalizedDocType,
        paymentStatus: defaultPaymentStatus
      };

      if (templateExpense) {
        if (templateExpense.vendor) next.vendor = templateExpense.vendor;
        if (templateExpense.vendorAddress) next.vendorAddress = templateExpense.vendorAddress;
        if (templateExpense.vendorCountry) next.vendorCountry = templateExpense.vendorCountry;
        if (templateExpense.invoiceNumber) next.invoiceNumber = templateExpense.invoiceNumber;
        if (templateExpense.category) next.category = templateExpense.category;
        if (templateExpense.currency) next.currency = templateExpense.currency;
        if (templateExpense.invoiceDate) next.invoiceDate = templateExpense.invoiceDate;
        if (templateExpense.dueDate) next.dueDate = templateExpense.dueDate;
        if (templateExpense.description && !next.description) next.description = templateExpense.description;
        if (templateExpense.paidDate) next.paidDate = templateExpense.paidDate;
        if (templateExpense.financialAccountId) {
          next.financialAccountId = templateExpense.financialAccountId;
          next.bankAccount = 'Financial Account';
        }
        if (templateExpense.contractId) {
          next.contractId = templateExpense.contractId;
        }
        if (templateExpense.contractName) {
          next.contractName = templateExpense.contractName;
        }
        if (templateExpense.contractVendorId) {
          next.contractVendorId = templateExpense.contractVendorId;
        }
        if (templateExpense.contractSnapshot) {
          next.contractSnapshot = templateExpense.contractSnapshot;
        }
        if (templateExpense.contractReference && !next.contractReference) {
          next.contractReference = templateExpense.contractReference;
        }
        if (templateExpense.contractUrl && !next.contractUrl) {
          next.contractUrl = templateExpense.contractUrl;
        }
 
        if (normalizedDocType === 'receipt') {
          if (templateExpense.amount) {
            const parsedAmount = parseNumericAmount(String(templateExpense.amount));
            next.amount = Number.isFinite(parsedAmount)
              ? parsedAmount.toFixed(2)
              : String(templateExpense.amount);
          }
          if (templateExpense.paymentMethod) next.paymentMethod = templateExpense.paymentMethod;
          if (templateExpense.paymentMethodDetails) next.paymentMethodDetails = templateExpense.paymentMethodDetails;
          if (!next.notes && templateExpense.invoiceNumber) {
            next.notes = `Receipt captured for invoice ${templateExpense.invoiceNumber}`;
          }
          if (!next.paidDate) {
            next.paidDate = templateExpense.invoiceDate || templateExpense.dueDate || todayIso;
          }
        } else if (normalizedDocType === 'statement') {
          if (templateExpense.amount) {
            const parsedAmount = parseNumericAmount(String(templateExpense.amount));
            next.amount = Number.isFinite(parsedAmount)
              ? parsedAmount.toFixed(2)
              : String(templateExpense.amount);
          }
          if (!next.notes && templateExpense.invoiceNumber) {
            next.notes = `Statement entry linked to invoice ${templateExpense.invoiceNumber}`;
          }
          if (!next.paidDate) {
            next.paidDate = templateExpense.paidDate || templateExpense.date || todayIso;
          }
        }
      }

      if ((normalizedDocType === 'receipt' || normalizedDocType === 'statement') && !next.paidDate) {
        next.paidDate = todayIso;
      }

      if (!next.financialAccountId) {
        const fallbackAccountId = getDefaultExpenseAccountId();
        if (fallbackAccountId) {
          next.financialAccountId = fallbackAccountId;
          next.bankAccount = 'Financial Account';
        }
      }

      return next;
    });
    setEditingExpense(null);
    setShowAddExpense(true);
  };

  const handleQuickAddDocument = (docType, expense) => {
    handleAddDocument(docType, `row-${docType}`, expense);
  };

  // Handle expense edit
  const handleEditExpense = (expense) => {
    try {
      if (!expense || !expense.id) {
        console.error('Invalid expense object passed to handleEditExpense:', expense);
        return;
      }
      
      setFormData({
      date: expense.date,
      invoiceDate: expense.invoiceDate || expense.date,
      dueDate: expense.dueDate || '',
      scheduledPaymentDate: expense.scheduledPaymentDate || '',
      paidDate: expense.paidDate || '',
      category: expense.category,
      currency: expense.currency || 'EUR',
      vendor: expense.vendor,
      vendorAddress: expense.vendorAddress || '',
      vendorCountry: expense.vendorCountry || companyCountry,
      invoiceNumber: expense.invoiceNumber || '',
      vatNumber: expense.vatNumber || '',
      chamberOfCommerceNumber: expense.chamberOfCommerceNumber || '',
      description: expense.description,
      amount: expense.amount,
      btw: expense.btw,
      reverseCharge: Boolean(expense.reverseCharge),
      bankAccount: expense.financialAccountId ? 'Financial Account' : (expense.bankAccount || 'Business Checking'),
      financialAccountId: expense.financialAccountId || '',
      paymentMethod: expense.paymentMethod,
      paymentMethodDetails: expense.paymentMethodDetails || '',
      documentType: expense.documentType || 'invoice',
      paymentStatus: expense.paymentStatus || 'open',
      approvalStatus: expense.approvalStatus || 'draft',
      approvalNotes: expense.approvalNotes || '',
      approvalRequestedAt: expense.approvalRequestedAt || '',
      approvedAt: expense.approvedAt || '',
      approvalAssigneeId: expense.approvalAssigneeId || '',
      approvalChecklist: expense.approvalChecklist || [{ title: 'Verify invoice', status: 'pending', completedAt: null }],
      lastApprovalReminderAt: expense.lastApprovalReminderAt || '',
      contractId: expense.contractId || '',
      contractName: expense.contractName || '',
      contractVendorId: expense.contractVendorId || '',
      contractSnapshot: expense.contractSnapshot || null,
      contractReference: expense.contractReference || '',
      contractUrl: expense.contractUrl || '',
      paymentScheduleNotes: expense.paymentScheduleNotes || '',
      vatValidationStatus: expense.vatValidationStatus || 'idle',
      vatValidatedAt: expense.vatValidatedAt || '',
      notes: expense.notes || ''
    });
    setVatValidationState({
      status: expense.vatValidationStatus === 'valid'
        ? 'success'
        : expense.vatValidationStatus === 'invalid'
          ? 'error'
          : 'idle',
      message: expense.vatValidationStatus === 'valid'
        ? 'VAT number validated via VIES.'
        : expense.vatValidationStatus === 'invalid'
          ? 'VAT validation failed previously. Please re-run validation.'
          : '',
      lastChecked: expense.vatValidatedAt || null
    });
      setEditingExpense(expense);
      setShowAddExpense(true);
      setExistingAttachments(expense.attachments || []);
      setSelectedFiles([]);
      setCurrentPreviewId(null);
      setZoomLevel(DEFAULT_ZOOM);
    } catch (error) {
      console.error('Error in handleEditExpense:', error);
      alert('Error opening expense for editing. Please try again.');
    }
  };

  // Handle view attachments
  const handleViewAttachments = (expense) => {
    setViewingExpense(expense);
    setShowAttachmentsModal(true);
  };

  // Handle Excel file import
  const handleExcelImport = async (file) => {
    const useExcelJs = true;

    if (useExcelJs) {
      try {
        const mappedData = await parseExpensesWithExcelJS(file);
        if (Array.isArray(mappedData) && mappedData.length > 0) {
        const preparedRows = prepareImportedRows(mappedData);
        setImportedData(preparedRows);
        setShowImportModal(true);
          return;
        }
      } catch (excelJsError) {
        console.warn('[ExcelJS] Falling back to SheetJS importer:', excelJsError);
      }
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find header row (look for common column names)
        let headerRowIndex = -1;
        const headerKeywords = ['date', 'category', 'vendor', 'description', 'amount', 'payment'];
        
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (Array.isArray(row)) {
            const rowText = row.join(' ').toLowerCase();
            if (headerKeywords.some(keyword => rowText.includes(keyword))) {
              headerRowIndex = i;
              break;
            }
          }
        }
        
        if (headerRowIndex === -1) {
          alert('Could not find header row in Excel file. Please ensure your file has column headers.');
          return;
        }
        
        const headers = jsonData[headerRowIndex].map(h => String(h || '').toLowerCase().trim());
        const rows = jsonData.slice(headerRowIndex + 1);
        
        // Map columns to expense fields
        const mappedData = rows
          .filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== ''))
          .map((row, index) => {
            const expense = {
              rowIndex: index + headerRowIndex + 2, // Excel row number
              date: '',
              invoiceDate: '',
              dueDate: '',
              category: '',
              vendor: '',
              vendorAddress: '',
              vendorCountry: '',
              description: '',
              amount: '',
              currency: 'EUR',
              paymentMethod: '',
              paymentMethodDetails: '',
              notes: '',
              frequency: '',
              invoiceNumber: '',
              documentType: 'invoice',
              reverseCharge: false
            };
            
            // Map columns based on header names
            headers.forEach((header, colIndex) => {
              const rawValue = row[colIndex];
              const value = rawValue !== undefined && rawValue !== null ? String(rawValue).trim() : '';
              
              if (header.includes('date')) {
                // Handle various date formats
                if (rawValue instanceof Date) {
                  const iso = rawValue.toISOString().split('T')[0];
                  if (header.includes('due')) {
                    expense.dueDate = iso;
                  } else if (header.includes('invoice')) {
                    expense.invoiceDate = iso;
                  } else {
                    expense.date = iso;
                  }
                } else if (typeof rawValue === 'number') {
                  const dateCode = XLSX.SSF?.parse_date_code?.(rawValue);
                  if (dateCode) {
                    const isoDate = `${dateCode.y.toString().padStart(4, '0')}-${dateCode.m.toString().padStart(2, '0')}-${dateCode.d.toString().padStart(2, '0')}`;
                    if (header.includes('due')) {
                      expense.dueDate = isoDate;
                    } else if (header.includes('invoice')) {
                      expense.invoiceDate = isoDate;
                    } else {
                      expense.date = isoDate;
                    }
                    return;
                  }
                }

                if (value) {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    if (header.includes('due')) {
                      expense.dueDate = date.toISOString().split('T')[0];
                    } else if (header.includes('invoice')) {
                      expense.invoiceDate = date.toISOString().split('T')[0];
                    } else {
                    expense.date = date.toISOString().split('T')[0];
                    }
                  } else {
                    // Try parsing common formats
                      const parts = value.split(/[./-]/);
                    if (parts.length === 3) {
                      const [m, d, y] = parts;
                      const year = y.length === 2 ? `20${y}` : y;
                      const normalizedDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      if (header.includes('due')) {
                        expense.dueDate = normalizedDate;
                      } else if (header.includes('invoice')) {
                        expense.invoiceDate = normalizedDate;
                      } else {
                        expense.date = normalizedDate;
                      }
                    }
                  }
                }
              } else if (header.includes('category')) {
                expense.category = value || 'Other';
              } else if (header.includes('vendor') || header.includes('service')) {
                expense.vendor = value;
              } else if (header.includes('address')) {
                expense.vendorAddress = value;
              } else if (header.includes('country')) {
                expense.vendorCountry = value.slice(0, 2).toUpperCase();
              } else if (header.includes('description')) {
                expense.description = value;
              } else if (header.includes('amount') && !header.includes('vat')) {
                // Remove currency symbols and parse
                if (typeof rawValue === 'number') {
                  expense.amount = rawValue;
                } else {
                  const sanitized = value.replace(/[€$£]/g, '').replace(/\s/g, '');
                  const normalized = sanitized.replace(/,/g, '.');
                  const numeric = parseFloat(normalized);
                  expense.amount = Number.isFinite(numeric) ? parseFloat(numeric.toFixed(2)) : 0;
                }

                if (value.includes('$')) {
                  expense.currency = 'USD';
                } else if (value.includes('£')) {
                  expense.currency = 'GBP';
                } else if (value.includes('€')) {
                  expense.currency = 'EUR';
                }
              } else if (header.includes('payment') && header.includes('method')) {
                const paymentParts = value.split('#');
                if (paymentParts.length > 1) {
                  expense.paymentMethod = paymentParts[0].trim();
                  expense.paymentMethodDetails = `#${paymentParts.slice(1).join('#')}`;
                } else {
                  expense.paymentMethod = value || 'Debit Card';
                }
              } else if (header.includes('notes')) {
                expense.notes = value;
              } else if (header.includes('frequency')) {
                expense.frequency = value;
              } else if (header.includes('invoice')) {
                expense.invoiceNumber = value;
              } else if (header.includes('currency')) {
                expense.currency = value.toUpperCase();
              } else if (header.includes('reverse') && header.includes('charge')) {
                expense.reverseCharge = value.toLowerCase().includes('true') || value.toLowerCase().includes('yes');
              } else if ((header.includes('vat') || header.includes('btw')) && header.includes('rate')) {
                const rate = parseInt(value, 10);
                if (!Number.isNaN(rate)) {
                  expense.btw = rate;
                }
              }
            });
            
            if (!expense.date && expense.invoiceDate) {
              expense.date = expense.invoiceDate;
            }
            
            return expense;
          })
          .filter(expense => expense.vendor || expense.description || expense.amount > 0);
        
        const preparedRows = prepareImportedRows(mappedData);
        setImportedData(preparedRows);
        setImportErrors([]);
        setShowImportModal(true);
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      alert('Error reading Excel file. Please ensure it\'s a valid .xlsx or .xls file.');
    }
  };

  const downloadImportErrors = (errorRows = []) => {
    if (!Array.isArray(errorRows) || errorRows.length === 0) {
      alert('No validation issues to download.');
      return;
    }

    const header = ['rowIndex', 'issues', 'date', 'invoiceDate', 'vendor', 'amount', 'description'];
    const rows = errorRows.map((row) => [
      row.rowIndex,
      (row.issues || []).join('; '),
      row.data?.date || row.data?.invoiceDate || '',
      row.data?.invoiceDate || '',
      row.data?.vendor || '',
      row.data?.amount || '',
      (row.data?.description || '').replace(/\n/g, ' ')
    ]);

    const csvContent = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `bizcopilot-import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle OCR processing for bank statements
  const handleOCRImport = async (file) => {
    setOcrProcessing(true);
    setImportProgress(0);
    
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setImportProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      // Convert file to image if PDF (for now, we'll handle images)
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      // Parse bank statement text
      const transactions = parseBankStatement(text);
      setImportedData(transactions);
      setShowImportModal(true);
      setImportType('ocr');
    } catch (error) {
      console.error('Error processing OCR:', error);
      alert('Error processing bank statement. Please ensure the image/PDF is clear and readable.');
    } finally {
      setOcrProcessing(false);
      setImportProgress(0);
    }
  };

  // Parse bank statement text into transactions
  const parseBankStatement = (text) => {
    const transactions = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    // Common patterns for Dutch bank statements (ING, etc.)
    // Date pattern: DD-MM-YYYY or DD/MM/YYYY
    const datePattern = /(\d{2}[-/]\d{2}[-/]\d{4})/;
    // Amount pattern: EUR amounts with +/- and decimals
    const amountPattern = /([+-]?\s*\d+[.,]\d{2})\s*EUR/i;
    // Card number pattern: Kaartnummer: 5248********2552
    const cardPattern = /Kaartnummer[:\s]+(\d{4}[*\s]+\d{4})/i;
    
    let currentTransaction = null;
    let cardNumber = '';
    
    lines.forEach((line, index) => {
      // Extract card number if found
      const cardMatch = line.match(cardPattern);
      if (cardMatch) {
        cardNumber = cardMatch[1].replace(/\s+/g, '');
      }
      
      // Look for date
      const dateMatch = line.match(datePattern);
      if (dateMatch) {
        // Save previous transaction if exists
        if (currentTransaction && currentTransaction.amount) {
          transactions.push(currentTransaction);
        }
        
        // Start new transaction
        const dateStr = dateMatch[1].replace(/\//g, '-');
        const [day, month, year] = dateStr.split('-');
        const date = `${year}-${month}-${day}`;
        
        currentTransaction = {
          rowIndex: index + 1,
          date: date,
          category: 'Other',
          vendor: '',
          description: line,
          amount: 0,
          paymentMethod: 'Debit Card',
          paymentMethodDetails: cardNumber ? `MC #${cardNumber}` : '',
          notes: ''
        };
      }
      
      // Look for amount
      if (currentTransaction) {
        const amountMatch = line.match(amountPattern);
        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/[+\s]/g, '').replace(',', '.');
          currentTransaction.amount = Math.abs(parseFloat(amountStr) || 0);
        }
        
        // Extract vendor/merchant name (usually before amount)
        if (!currentTransaction.vendor && !amountMatch) {
          // Common merchant patterns
          const merchantPattern = /([A-Z][A-Z0-9\s.]+(?:INC|COM|BV|B\.V\.|LTD|LLC|NL|EU|USA)?)/;
          const merchantMatch = line.match(merchantPattern);
          if (merchantMatch && merchantMatch[1].length > 3) {
            currentTransaction.vendor = merchantMatch[1].trim();
            currentTransaction.description = line;
          }
        }
      }
    });
    
    // Add last transaction
    if (currentTransaction && currentTransaction.amount) {
      transactions.push(currentTransaction);
    }
    
    return transactions.filter(t => t.amount > 0);
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!currentCompanyId || !currentUser) {
      alert('Please select a company to import expenses.');
      return;
    }
    
    if (importedData.length === 0) {
      alert('No data to import.');
      return;
    }
    
    setImporting(true);
    setImportProgress(0);
    
    try {
      let successCount = 0;
      let duplicateCount = 0;
      const errorDetails = [];
      const errorRows = [];

      const buildExpenseKey = ({ date, invoiceDate, vendor, amount, invoiceNumber }) => {
        const canonicalDate = (date || invoiceDate || '').slice(0, 10);
        const vendorKey = (vendor || '').toLowerCase().trim();
        const invoiceKey = (invoiceNumber || '').toLowerCase().trim();
        const amountNumber = Number.isFinite(amount) ? amount : parseFloat(amount || 0);
        const amountKey = Number.isFinite(amountNumber) ? amountNumber.toFixed(2) : '0.00';
        return `${canonicalDate}|${vendorKey}|${amountKey}|${invoiceKey}`;
      };

      const existingKeys = new Set(
        (expenses || []).map((expense) =>
          buildExpenseKey({
            date: expense.date,
            invoiceDate: expense.invoiceDate,
            vendor: expense.vendor,
            amount: parseFloat(expense.amount),
            invoiceNumber: expense.invoiceNumber
          })
        )
      );

      for (let i = 0; i < importedData.length; i++) {
        const expenseData = importedData[i];
        const rowLabel = expenseData.rowIndex ? `Row ${expenseData.rowIndex}` : `Row ${i + 1}`;

        try {
          const parsedAmount = typeof expenseData.amount === 'number'
            ? expenseData.amount
            : parseNumericAmount(String(expenseData.amount || ''));

          if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
            throw new Error('Amount is missing or invalid.');
          }
          if (!expenseData.date && !expenseData.invoiceDate) {
            throw new Error('Date is missing.');
          }
          if (!expenseData.vendor) {
            throw new Error('Vendor is missing.');
          }

          const dedupeKey = buildExpenseKey({
            date: expenseData.date,
            invoiceDate: expenseData.invoiceDate,
            vendor: expenseData.vendor,
            amount: parsedAmount,
            invoiceNumber: expenseData.invoiceNumber
          });

          if (existingKeys.has(dedupeKey)) {
            duplicateCount += 1;
            errorDetails.push(`${rowLabel} — Duplicate detected (skipped).`);
            errorRows.push({
              rowIndex: expenseData.rowIndex || i + 1,
              issues: ['Duplicate detected (skipped).'],
              data: expenseData
            });
            continue;
          }

          const descriptionValue = (expenseData.description || expenseData.vendor || 'Imported expense').toString();

          const expenseToAdd = {
            date: expenseData.date || expenseData.invoiceDate,
            invoiceDate: expenseData.invoiceDate || expenseData.date,
            dueDate: expenseData.dueDate || '',
            scheduledPaymentDate: expenseData.scheduledPaymentDate || '',
            category: expenseData.category || 'Other',
            currency: expenseData.currency || 'EUR',
            vendor: expenseData.vendor,
            vendorAddress: expenseData.vendorAddress || '',
            vendorCountry: expenseData.vendorCountry || companyCountry,
            invoiceNumber: expenseData.invoiceNumber || '',
            vatNumber: expenseData.vatNumber || '',
            chamberOfCommerceNumber: expenseData.chamberOfCommerceNumber || '',
            description: descriptionValue,
            amount: parsedAmount.toFixed(2),
            btw: typeof expenseData.btw === 'number' ? expenseData.btw : 21,
            reverseCharge: Boolean(expenseData.reverseCharge),
            bankAccount: 'Business Checking',
            financialAccountId: '',
            paymentMethod: expenseData.paymentMethod || 'Debit Card',
            paymentMethodDetails: expenseData.paymentMethodDetails || '',
            documentType: importType === 'ocr' ? 'statement' : (expenseData.documentType || 'invoice'),
            paymentStatus: (expenseData.paymentStatus || 'open').toLowerCase(),
            approvalStatus: (expenseData.approvalStatus || 'awaiting').toLowerCase(),
            approvalNotes: expenseData.approvalNotes || '',
            approvalRequestedAt: expenseData.approvalRequestedAt || new Date().toISOString(),
            approvedAt: expenseData.approvedAt || '',
            contractId: expenseData.contractId || '',
            contractName: expenseData.contractName || '',
            contractVendorId: expenseData.contractVendorId || '',
            contractSnapshot: expenseData.contractSnapshot || null,
            contractReference: expenseData.contractReference || '',
            contractUrl: expenseData.contractUrl || '',
            paymentScheduleNotes: expenseData.paymentScheduleNotes || '',
            notes: expenseData.notes || '',
            vatValidationStatus: 'idle',
            vatValidatedAt: '',
            createdAt: new Date().toISOString(),
            importedFromExcel: true
          };

          await addCompanyExpense(currentCompanyId, currentUser.uid, expenseToAdd);
          successCount += 1;
          existingKeys.add(dedupeKey);
        } catch (error) {
          console.error(`Error importing ${rowLabel}:`, error);
          errorDetails.push(`${rowLabel} — ${error?.message || 'Unknown error'}`);
          errorRows.push({
            rowIndex: expenseData.rowIndex || i + 1,
            issues: [error?.message || 'Unknown error'],
            data: expenseData
          });
        }

        setImportProgress(((i + 1) / importedData.length) * 100);
      }

      await loadExpenses();

      const errorCount = errorDetails.length;
      const issuesSummary = errorCount > 0
        ? `\nErrors: ${errorCount}\n\nTop issues:\n${errorDetails.slice(0, 5).join('\n')}${errorCount > 5 ? '\n...' : ''}`
        : '';
      const duplicateSummary = duplicateCount > 0
        ? `\nSkipped duplicates: ${duplicateCount}`
        : '';
      
      alert(`Import completed!\nSuccessfully imported: ${successCount}${duplicateSummary}${issuesSummary}`);
      setShowImportModal(false);
      setImportedData([]);
      setImportFile(null);
    } catch (error) {
      console.error('Error during bulk import:', error);
      alert(`Error during import. Please try again.\n${error?.message || ''}`);
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // Helper function to get date range based on period type
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (periodType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (periodType) {
      case 'today':
        return {
          startDate: formatDateLocal(today),
          endDate: formatDateLocal(today)
        };
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          startDate: formatDateLocal(weekStart),
          endDate: formatDateLocal(weekEnd)
        };
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          startDate: formatDateLocal(monthStart),
          endDate: formatDateLocal(monthEnd)
        };
      }
      case 'year': {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        return {
          startDate: formatDateLocal(yearStart),
          endDate: formatDateLocal(yearEnd)
        };
      }
      default:
        return { startDate: '', endDate: '' };
    }
  };

  const { vendorOptions, vendorHasMissing } = useMemo(() => {
    const nameSet = new Set();
    let hasMissing = false;

    expenses.forEach(expense => {
      const vendorName = (expense.vendor || '').trim();
      if (vendorName) {
        nameSet.add(vendorName);
      } else {
        hasMissing = true;
      }
    });

    const sorted = Array.from(nameSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    return {
      vendorOptions: sorted,
      vendorHasMissing: hasMissing
    };
  }, [expenses]);

  // Update date range when period type changes
  useEffect(() => {
    if (filters.periodType && filters.periodType !== 'all' && filters.periodType !== 'custom') {
      const dateRange = getDateRange(filters.periodType);
      setFilters(prev => ({
        ...prev,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }));
    }
  }, [filters.periodType]);

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (filters.category !== 'all' && exp.category !== filters.category) return false;
      if (filters.financialAccountId !== 'all') {
        if (filters.financialAccountId.startsWith('legacy:')) {
          const legacyName = filters.financialAccountId.replace('legacy:', '');
          const expenseBank = (exp.bankAccount || '').toLowerCase();
          if (expenseBank !== legacyName.toLowerCase()) return false;
        } else if ((exp.financialAccountId || '') !== filters.financialAccountId) {
          return false;
        }
      }
      if (filters.paymentMethod !== 'all' && exp.paymentMethod !== filters.paymentMethod) return false;
      if (filters.vendor !== 'all') {
        const expenseVendor = (exp.vendor || '').trim();
        if (filters.vendor === '__missing__') {
          if (expenseVendor) return false;
        } else if (expenseVendor.toLowerCase() !== filters.vendor.toLowerCase()) {
          return false;
        }
      }
      const docType = (exp.documentType || 'invoice').toLowerCase();
      if (filters.documentType !== 'all' && docType !== filters.documentType) return false;
      const paymentStatus = (exp.paymentStatus || 'open').toLowerCase();
      if (filters.paymentStatus !== 'all' && paymentStatus !== filters.paymentStatus) return false;
      if (filters.startDate && exp.date < filters.startDate) return false;
      if (filters.endDate && exp.date > filters.endDate) return false;
      return true;
    });
  }, [expenses, filters]);

  const linkedInvoicesByReceipt = useMemo(() => {
    const map = new Map();
    filteredExpenses.forEach(expense => {
      const docType = (expense.documentType || '').toLowerCase();
      if (docType === 'invoice' && expense.linkedPaymentExpenseId) {
        map.set(expense.linkedPaymentExpenseId, expense);
      }
    });
    return map;
  }, [filteredExpenses]);

  const linkedStatementsByReceipt = useMemo(() => {
    const map = new Map();
    filteredExpenses.forEach(expense => {
      const docType = (expense.documentType || '').toLowerCase();
      if (docType === 'statement' && expense.linkedReceiptExpenseId) {
        map.set(expense.linkedReceiptExpenseId, expense);
      }
    });
    return map;
  }, [filteredExpenses]);

  const visibleExpenses = useMemo(() => {
    return filteredExpenses.filter(expense => {
      const docType = (expense.documentType || '').toLowerCase();
      if (docType === 'invoice' && expense.linkedPaymentExpenseId) {
        return false;
      }
       if (docType === 'statement' && expense.linkedReceiptExpenseId) {
         return false;
       }
      return true;
    });
  }, [filteredExpenses]);

  const expensesRequiringConversion = useMemo(() => {
    return expenses.filter((expense) => {
      const currency = (expense.currency || BASE_CURRENCY).toUpperCase();
      return currency !== BASE_CURRENCY;
    });
  }, [expenses]);

  const conversionSummary = useMemo(() => {
    const summary = expensesRequiringConversion.reduce((acc, expense) => {
      const currency = (expense.currency || BASE_CURRENCY).toUpperCase();
      acc[currency] = (acc[currency] || 0) + 1;
      return acc;
    }, {});
    return summary;
  }, [expensesRequiringConversion]);

  const approvalSummary = useMemo(() => {
    const counts = approvalStatusChoices.reduce((acc, choice) => {
      acc[choice.value] = 0;
      return acc;
    }, { total: 0 });

    filteredExpenses.forEach((expense) => {
      const status = (expense.approvalStatus || 'draft').toLowerCase();
      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
      counts.total += 1;
    });

    return counts;
  }, [filteredExpenses]);

  const normalizationRunning = normalizeStatus.state === 'running';
  const normalizeProgressPercent = normalizeStatus.total > 0
    ? Math.round((normalizeStatus.processed / normalizeStatus.total) * 100)
    : 0;

  // Calculate totals
  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => {
      const docType = (exp.documentType || '').toLowerCase();
      if (docType === 'receipt' && exp.linkedInvoiceExpenseId) {
        return sum;
      }
      if (docType === 'statement' && exp.linkedReceiptExpenseId) {
        return sum;
      }
      const amount = parseFloat(exp.amount);
      if (!Number.isFinite(amount)) {
        return sum;
      }
      return sum + amount;
    }, 0);
  }, [filteredExpenses]);

  const totalVAT = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => {
      const docType = (exp.documentType || '').toLowerCase();
      if (docType === 'receipt' && exp.linkedInvoiceExpenseId) {
        return sum;
      }
      if (docType === 'statement' && exp.linkedReceiptExpenseId) {
        return sum;
      }
      const amount = parseFloat(exp.amount);
      if (!Number.isFinite(amount)) {
        return sum;
      }
      const vatRate = parseFloat(exp.btw || 0) / 100;
      return sum + (amount * vatRate);
    }, 0);
  }, [filteredExpenses]);

  const getConversionRate = useCallback(async (fromCurrency, toCurrency, requestedDate) => {
    const from = (fromCurrency || BASE_CURRENCY).toUpperCase();
    const to = (toCurrency || BASE_CURRENCY).toUpperCase();
    const failureMessages = [];
    lastConversionErrorsRef.current = [];

    if (from === to) {
      lastConversionErrorsRef.current = [];
      return {
        rate: 1,
        rateDate: requestedDate || 'latest',
        source: 'convert'
      };
    }

    const attempts = [];
    const attemptKeys = new Set();
    const pushAttempt = (value) => {
      const key = value || 'latest';
      if (!attemptKeys.has(key)) {
        attemptKeys.add(key);
        attempts.push(value);
      }
    };

    if (requestedDate) {
      const parsed = new Date(requestedDate);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (parsed > today) {
          pushAttempt(null);
        } else {
          pushAttempt(formatDateLocal(parsed));
          for (let offset = 1; offset <= 7; offset += 1) {
            const fallback = new Date(parsed);
            fallback.setDate(parsed.getDate() - offset);
            if (fallback.getFullYear() < 2000) {
              break;
            }
            pushAttempt(formatDateLocal(fallback));
          }
          pushAttempt(null);
        }
      } else {
        pushAttempt(null);
      }
    } else {
      pushAttempt(null);
    }

    for (const attemptDate of attempts) {
      const cacheKey = `${from}-${to}-${attemptDate || 'latest'}`;
      const cachedResult = conversionRateCacheRef.current.get(cacheKey);
      if (cachedResult && cachedResult.rate) {
        lastConversionErrorsRef.current = [];
        return cachedResult;
      }

      const candidateResults = [];

      const fetchStrategies = [
        async () => {
          const params = new URLSearchParams({
            from,
            to,
            amount: '1'
          });
          if (attemptDate) {
            params.set('date', attemptDate);
          }
          params.set('places', '6');

          const response = await fetch(`https://api.exchangerate.host/convert?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`convert endpoint HTTP ${response.status}`);
          }
          const data = await response.json();
          const rate = typeof data?.info?.rate === 'number' && Number.isFinite(data.info.rate)
            ? data.info.rate
            : (typeof data?.result === 'number' && Number.isFinite(data.result) ? data.result : null);
          if (rate) {
            return {
              rate,
              rateDate: data?.date || attemptDate || 'latest',
              source: 'convert'
            };
          }
          const errorReason = data?.error?.type || data?.error || 'Invalid conversion data';
          throw new Error(typeof errorReason === 'string' ? errorReason : JSON.stringify(errorReason));
        },
        async () => {
          const endpointDate = attemptDate || 'latest';
          const params = new URLSearchParams({
            base: from,
            symbols: to
          });
          const response = await fetch(`https://api.exchangerate.host/${endpointDate}?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`historical endpoint HTTP ${response.status}`);
          }
          const data = await response.json();
          const rate = typeof data?.rates?.[to] === 'number' && Number.isFinite(data.rates[to])
            ? data.rates[to]
            : null;
          if (rate) {
            return {
              rate,
              rateDate: data?.date || endpointDate,
              source: 'historical'
            };
          }
          const errorReason = data?.error?.type || data?.error || 'Invalid historical data';
          throw new Error(typeof errorReason === 'string' ? errorReason : JSON.stringify(errorReason));
        },
        async () => {
          const frankfurtDate = attemptDate || 'latest';
          const params = new URLSearchParams({
            from,
            to
          });
          const response = await fetch(`https://api.frankfurter.app/${frankfurtDate}?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`frankfurter endpoint HTTP ${response.status}`);
          }
          const data = await response.json();
          const rate = typeof data?.rates?.[to] === 'number' && Number.isFinite(data.rates[to])
            ? data.rates[to]
            : null;
          if (rate) {
            return {
              rate,
              rateDate: data?.date || frankfurtDate,
              source: 'frankfurter'
            };
          }
          const errorReason = data?.error?.message || data?.error || 'Invalid frankfurter data';
          throw new Error(typeof errorReason === 'string' ? errorReason : JSON.stringify(errorReason));
        }
      ];

      for (const strategy of fetchStrategies) {
        try {
          const result = await strategy();
          if (result?.rate) {
            conversionRateCacheRef.current.set(cacheKey, result);
            lastConversionErrorsRef.current = [];
            return result;
          }
        } catch (error) {
          candidateResults.push(`(${attemptDate || 'latest'}) ${error?.message || error}`);
          failureMessages.push(`(${attemptDate || 'latest'}) ${error?.message || error}`);
          console.warn(`Conversion rate fallback (${from}→${to}) failed:`, error?.message || error);
        }
      }
    }

    if (failureMessages.length) {
      lastConversionErrorsRef.current = failureMessages;
    }

    return null;
  }, []);

  const handleNormalizeCurrency = useCallback(async () => {
    if (!currentCompanyId) {
      alert('Please select a company before normalizing currency.');
      return;
    }
    if (!expensesRequiringConversion.length) {
      setShowNormalizeModal(false);
      return;
    }

    setNormalizeStatus({
      state: 'running',
      total: expensesRequiringConversion.length,
      processed: 0,
      skipped: 0,
      errors: []
    });

    const errors = [];

    for (let index = 0; index < expensesRequiringConversion.length; index += 1) {
      const expense = expensesRequiringConversion[index];
      const originalCurrency = (expense.currency || BASE_CURRENCY).toUpperCase();
      if (originalCurrency === BASE_CURRENCY) {
        setNormalizeStatus(prev => ({
          ...prev,
          processed: prev.processed + 1,
          skipped: prev.skipped + 1
        }));
        continue;
      }

      const amount = parseFloat(expense.amount);
      if (!Number.isFinite(amount)) {
        errors.push(`Skipping ${expense.invoiceNumber || expense.id}: invalid amount "${expense.amount}".`);
        setNormalizeStatus(prev => ({
          ...prev,
          processed: prev.processed + 1,
          skipped: prev.skipped + 1,
          errors
        }));
        continue;
      }

      const referenceDate = expense.invoiceDate || expense.paidDate || expense.date || todayIso;
      const rateResult = await getConversionRate(originalCurrency, BASE_CURRENCY, referenceDate);
      if (!rateResult || !rateResult.rate) {
        const failureNotes = Array.isArray(lastConversionErrorsRef.current) && lastConversionErrorsRef.current.length
          ? `Details: ${lastConversionErrorsRef.current.join('; ')}`
          : 'Rate service returned no data.';
        errors.push(`Rate unavailable for ${originalCurrency} → ${BASE_CURRENCY} on ${referenceDate} (including historical fallback). ${failureNotes}`);
        setNormalizeStatus(prev => ({
          ...prev,
          processed: prev.processed + 1,
          skipped: prev.skipped + 1,
          errors
        }));
        continue;
      }

      const { rate, rateDate } = rateResult;
      const conversionSourceLabel = rateResult.source === 'historical'
        ? 'exchangerate.host (historical)'
        : rateResult.source === 'frankfurter'
          ? 'frankfurter.app'
          : 'exchangerate.host';
      const convertedAmount = (amount * rate).toFixed(2);
      try {
        await updateCompanyExpense(currentCompanyId, expense.id, {
          currency: BASE_CURRENCY,
          amount: convertedAmount,
          conversionMeta: {
            originalAmount: amount,
            originalCurrency,
            conversionRate: rate,
            requestedDate: referenceDate,
            rateDateUsed: rateDate,
            conversionSource: conversionSourceLabel,
            convertedAt: new Date().toISOString()
          }
        });

        setNormalizeStatus(prev => ({
          ...prev,
          processed: prev.processed + 1
        }));
      } catch (error) {
        console.error('Currency normalization error:', error);
        errors.push(`Failed to update ${expense.invoiceNumber || expense.id}: ${error.message || 'unknown error'}.`);
        setNormalizeStatus(prev => ({
          ...prev,
          processed: prev.processed + 1,
          errors
        }));
      }
    }

    await loadExpenses();
    setNormalizeStatus(prev => ({
      ...prev,
      state: errors.length > 0 ? 'error' : 'success',
      errors
    }));
  }, [
    currentCompanyId,
    expensesRequiringConversion,
    getConversionRate,
    loadExpenses,
    todayIso
  ]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatCurrencyFor = (amount, currencyCode = BASE_CURRENCY) => {
    if (!Number.isFinite(amount)) {
      return `${currencyCode || ''} ${amount}`;
    }
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode || BASE_CURRENCY
      }).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ${currencyCode || ''}`;
    }
  };

  const financialAccountFilterOptions = useMemo(() => {
    if (!Array.isArray(financialAccounts)) return [];
    return financialAccounts.map((account) => ({
      value: account.id,
      label: account.name || 'Unnamed account',
      currency: account.currency || 'EUR'
    }));
  }, [financialAccounts]);

  const legacyBankOptions = useMemo(() => {
    const banks = new Set();
    (expenses || []).forEach((expense) => {
      if (!expense) return;
      const bankName = (expense.bankAccount || '').toString().trim();
      if (!bankName) return;
      if (bankName.toLowerCase() === 'financial account') return;
      banks.add(bankName);
    });
    return Array.from(banks)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((name) => ({
        value: `legacy:${name}`,
        label: `${name} (legacy)`
      }));
  }, [expenses]);

  const financialAccountFilterOptionsWithLegacy = useMemo(() => {
    return [
      ...financialAccountFilterOptions,
      ...legacyBankOptions
    ];
  }, [financialAccountFilterOptions, legacyBankOptions]);

  const financialAccountLookup = useMemo(() => {
    const map = new Map();
    (financialAccounts || []).forEach((account) => {
      if (account && account.id) {
        map.set(account.id, account);
      }
    });
    return map;
  }, [financialAccounts]);

  const expenseEligibleAccounts = useMemo(() => {
    if (!Array.isArray(financialAccounts)) return [];
    return financialAccounts.filter((account) => {
      if (!account || account.isActive === false) return false;
      const links = Array.isArray(account.linkedTo) ? account.linkedTo : [];
      if (links.length === 0) return true;
      return links.includes('expenses');
    });
  }, [financialAccounts]);

  const getDefaultExpenseAccountId = useCallback(() => {
    if (!Array.isArray(financialAccounts) || financialAccounts.length === 0) {
      return '';
    }

    const eligible = expenseEligibleAccounts.length > 0
      ? expenseEligibleAccounts
      : financialAccounts.filter((account) => account && account.isActive !== false);

    if (eligible.length === 0) {
      return '';
    }

    const lastUsed = lastUsedFinancialAccountRef.current;
    if (lastUsed) {
      const match = eligible.find((account) => account.id === lastUsed);
      if (match) {
        return match.id;
      }
    }

    return eligible[0]?.id || '';
  }, [financialAccounts, expenseEligibleAccounts]);

  const contractSelectOptions = useMemo(() => {
    if (!Array.isArray(contracts)) return [];
    return contracts.map((contract) => {
      const vendor = contract.vendorName || contract.vendor || '';
      const status = contract.status || 'active';
      const labelParts = [contract.name || contract.reference || 'Unnamed contract'];
      if (vendor) {
        labelParts.push(`• ${vendor}`);
      }
      labelParts.push(`(${status})`);
      return {
        value: contract.id,
        label: labelParts.join(' '),
        raw: contract
      };
    });
  }, [contracts]);

  const selectedContract = useMemo(() => {
    if (!formData.contractId) return null;
    return contracts.find((contract) => contract.id === formData.contractId) || null;
  }, [contracts, formData.contractId]);

  const contractDetails = useMemo(() => {
    if (formData.contractSnapshot) {
      return formData.contractSnapshot;
    }
    if (selectedContract) {
      return buildContractSnapshot(selectedContract);
    }
    return null;
  }, [formData.contractSnapshot, selectedContract]);

  const handleContractSelection = useCallback((contractId) => {
    if (!contractId) {
      setFormData((prev) => ({
        ...prev,
        contractId: '',
        contractName: '',
        contractVendorId: '',
        contractSnapshot: null
      }));
      return;
    }

    const contract = contracts.find((item) => item.id === contractId);
    const snapshot = buildContractSnapshot(contract);

    setFormData((prev) => ({
      ...prev,
      contractId,
      contractName: contract?.name || prev.contractName || '',
      contractVendorId: contract?.vendorId || prev.contractVendorId || '',
      contractSnapshot: snapshot,
      contractReference: prev.contractReference || contract?.reference || contract?.name || '',
      contractUrl: prev.contractUrl || contract?.url || ''
    }));
  }, [contracts]);

  useEffect(() => {
    if (!formData.contractId) {
      return;
    }

    const contract = contracts.find((item) => item.id === formData.contractId);
    if (!contract) {
      return;
    }

    const latestSnapshot = buildContractSnapshot(contract);
    setFormData((prev) => {
      if (prev.contractId !== contract.id) {
        return prev;
      }

      const prevSnapshot = prev.contractSnapshot || {};
      const snapshotChanged = JSON.stringify(prevSnapshot) !== JSON.stringify(latestSnapshot || {});

      if (!snapshotChanged && prev.contractName && prev.contractVendorId) {
        return prev;
      }

      return {
        ...prev,
        contractName: prev.contractName || contract.name || '',
        contractVendorId: prev.contractVendorId || contract.vendorId || '',
        contractSnapshot: latestSnapshot
      };
    });
  }, [contracts, formData.contractId]);

  // Show skeleton UI instead of blocking blank screen
  return (
    <div className="w-full">

      {/* Add/Edit Expense Modal - Available in all views */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-medium">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h3>
                <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => handleCloseModal('cancel_button')}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form={ADD_EXPENSE_FORM_ID}
                    className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                  >
                    {editingExpense
                      ? formData.documentType === 'receipt'
                        ? 'Update Payment'
                        : 'Update Document'
                      : formData.documentType === 'receipt'
                        ? 'Save Payment'
                        : 'Save Expense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCloseModal('close_button')}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                    aria-label="Close"
                >
                    <FaTimes className="w-5 h-5" />
                </button>
                </div>
              </div>
            </div>

            <form id={ADD_EXPENSE_FORM_ID} onSubmit={handleSubmit} className="px-5 py-3 flex-1">
              {showAddDocumentIntro && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <FaInfoCircle className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Tip: capture every document in one place</p>
                    <p className="mt-1 text-blue-800">
                      Select the document type at the bottom-right to tag invoices, receipts, and bank statements. Receipts default to Paid so you can attach proof without double-counting.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => completeAddDocumentOnboarding('dismissed')}
                    className="ml-2 shrink-0 rounded-md border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Got it
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1.45fr)] gap-6 lg:h-[75vh]">
                <div className="space-y-4 overflow-y-auto pr-2 lg:max-h-[72vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                        Booking Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        name="invoiceDate"
                        value={formData.invoiceDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date (Optional)
                      </label>
                      <input
                        type="date"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <input
                    type="text"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Vendor name"
                  />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vendor Address (Optional)
                      </label>
                      <input
                        type="text"
                        name="vendorAddress"
                        value={formData.vendorAddress}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Street, City, Country"
                      />
                    </div>
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vendor Country
                      </label>
                      <select
                        name="vendorCountry"
                        value={formData.vendorCountry}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select country</option>
                        {EU_COUNTRY_OPTIONS.map((country) => (
                          <option key={country.code} value={country.code}>{country.label}</option>
                        ))}
                        <option value="OTHER">Outside EU / Manual</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Defaults to your company's country. Adjust if this vendor is based elsewhere.
                      </p>
                    </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Invoice #"
                  />
                </div>
              </div>

                    <>
                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        VAT Number (Optional)
                      </label>
                      <input
                        type="text"
                        name="vatNumber"
                        value={formData.vatNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. NL123456789B01"
                      />
                    </div>
                        <button
                          type="button"
                          onClick={handleVatValidation}
                          className="inline-flex items-center justify-center px-4 py-2 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Validate VAT
                        </button>
                  </div>

                      {vatValidationState.status !== 'idle' && (
                        <div
                          className={`text-sm rounded-md px-3 py-2 ${
                            vatValidationState.status === 'success'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : vatValidationState.status === 'loading'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          }`}
                        >
                          <p>{vatValidationState.message}</p>
                          {vatValidationState.lastChecked && (
                            <p className="text-xs mt-1">
                              Last checked: {new Date(vatValidationState.lastChecked).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chamber of Commerce Number (Optional)
                      </label>
                      <input
                        type="text"
                        name="chamberOfCommerceNumber"
                        value={formData.chamberOfCommerceNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="KVK Number"
                      />
                    </div>
                        <div className="flex items-center gap-3 mt-6 md:mt-9">
                          <input
                            id="reverseCharge"
                            type="checkbox"
                            checked={formData.reverseCharge}
                            onChange={handleReverseChargeChange}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="reverseCharge" className="text-sm text-gray-700">
                            Reverse charge applies (cross-border B2B)
                          </label>
                    </div>
                  </div>
                    </>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Expense description"
                />
              </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CURRENCY_OPTIONS.map((currency) => (
                          <option key={currency} value={currency}>{currency}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                        VAT Rate (%)
                  </label>
                  <select
                    name="btw"
                    value={formData.btw}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {btw_rates.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-6 space-y-4">
                <h4 className="text-base font-semibold text-gray-900">Approval & Scheduling</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Approval Status
                    </label>
                    <select
                      name="approvalStatus"
                      value={formData.approvalStatus}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {approvalStatusChoices.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  {formData.approvalStatus === 'awaiting' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Requested From
                      </label>
                      <select
                        name="approvalAssigneeId"
                        value={formData.approvalAssigneeId || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={membersLoading}
                      >
                        <option value="">Select team member</option>
                        {companyMembers.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.displayName || member.email} {member.role ? `(${member.role})` : ''}
                          </option>
                        ))}
                      </select>
                      {membersLoading && (
                        <p className="text-xs text-gray-500 mt-1">Loading team members…</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Payment Date
                    </label>
                    <input
                      type="date"
                      name="scheduledPaymentDate"
                      value={formData.scheduledPaymentDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Linked Contract
                    </label>
                    <select
                      value={formData.contractId || ''}
                      onChange={(e) => handleContractSelection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={contractsLoading}
                    >
                      <option value="">No linked contract</option>
                      {contractSelectOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {contractsLoading && (
                      <p className="text-xs text-gray-500 mt-1">Loading contracts…</p>
                    )}
                    {contractsError && (
                      <p className="text-xs text-red-600 mt-1">{contractsError}</p>
                    )}
                    {!contractsLoading && !contractsError && contractSelectOptions.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        No contracts saved yet. You can keep this expense unlinked or add contracts from Settings → Contracts.
                      </p>
                    )}
                    {formData.contractId && (
                      <button
                        type="button"
                        onClick={() => handleContractSelection('')}
                        className="mt-2 text-xs text-purple-700 hover:text-purple-900"
                      >
                        Clear selection
                      </button>
                    )}
                    {contractDetails && (
                      <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-800 space-y-1">
                        <p className="text-sm font-semibold text-purple-900">
                          {contractDetails.name || contractDetails.reference || 'Linked contract'}
                        </p>
                        {contractDetails.reference && contractDetails.reference !== contractDetails.name && (
                          <p>Reference: {contractDetails.reference}</p>
                        )}
                        {contractDetails.vendorName && (
                          <p>Vendor: {contractDetails.vendorName}</p>
                        )}
                        {contractDetails.status && (
                          <p>Status: {contractDetails.status}</p>
                        )}
                        {(contractDetails.startDate || contractDetails.endDate) && (
                          <p>
                            Term: {contractDetails.startDate || '—'} – {contractDetails.endDate || '—'}
                          </p>
                        )}
                        {contractDetails.value !== null && (
                          <p>
                            Value: {contractDetails.value} {contractDetails.currency || ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Reference (optional)
                    </label>
                    <input
                      type="text"
                      name="contractReference"
                      value={formData.contractReference}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., MSP Master Agreement"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Link (optional)
                    </label>
                    <input
                      type="url"
                      name="contractUrl"
                      value={formData.contractUrl}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Notes (optional)
                  </label>
                  <textarea
                    name="paymentScheduleNotes"
                    value={formData.paymentScheduleNotes}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add reminders or payment instructions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Approval Notes (internal)
                  </label>
                  <textarea
                    name="approvalNotes"
                    value={formData.approvalNotes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add context for the approver or record decisions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Checklist
                  </label>
                  <div className="space-y-2">
                    {Array.isArray(formData.approvalChecklist) && formData.approvalChecklist.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.status === 'completed'}
                          onChange={(e) => {
                            const updated = [...formData.approvalChecklist];
                            updated[index] = {
                              ...updated[index],
                              status: e.target.checked ? 'completed' : 'pending',
                              completedAt: e.target.checked ? new Date().toISOString() : null
                            };
                            setFormData(prev => ({ ...prev, approvalChecklist: updated }));
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={item.title || ''}
                          onChange={(e) => {
                            const updated = [...formData.approvalChecklist];
                            updated[index] = { ...updated[index], title: e.target.value };
                            setFormData(prev => ({ ...prev, approvalChecklist: updated }));
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Checklist item"
                        />
                        {formData.approvalChecklist.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formData.approvalChecklist.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, approvalChecklist: updated }));
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Remove item"
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(formData.approvalChecklist || []), { title: '', status: 'pending', completedAt: null }];
                        setFormData(prev => ({ ...prev, approvalChecklist: updated }));
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <FaPlusCircle className="w-3 h-3" />
                      Add checklist item
                    </button>
                  </div>
                </div>
              </div>

          {editingExpense?.conversionMeta && (
            <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-md px-3 py-3 text-sm text-indigo-800 space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <FaSyncAlt className="w-4 h-4" />
                Currency normalization details
              </p>
              <p>
                {formatCurrencyFor(editingExpense.conversionMeta.originalAmount, editingExpense.conversionMeta.originalCurrency)} → {formatCurrency(parseFloat(formData.amount) || 0)}
              </p>
              <p>
                Rate {Number.isFinite(editingExpense.conversionMeta.conversionRate) ? editingExpense.conversionMeta.conversionRate.toFixed(4) : '—'} • {editingExpense.conversionMeta.rateDateUsed ? `Rate date ${formatDateTime(editingExpense.conversionMeta.rateDateUsed, { dateStyle: 'medium' })}` : 'Latest available'} • Source {editingExpense.conversionMeta.conversionSource || 'Unknown'}
              </p>
              {editingExpense.conversionMeta.convertedAt && (
                <p className="text-xs text-indigo-600">
                  Converted {formatDateTime(editingExpense.conversionMeta.convertedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
          )}

                  {paymentSectionVisible ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FinancialAccountSelect
                          value={formData.financialAccountId}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              financialAccountId: e.target.value,
                              bankAccount: e.target.value ? 'Financial Account' : prev.bankAccount
                            }));
                          }}
                          filterBy={['expenses']}
                          label="Financial Account"
                          required={false}
                          showBalance={true}
                          accounts={financialAccounts}
                          loading={financialAccountsLoading}
                          error={financialAccountsError}
                          onAddAccount={() => {
                            window.open('/settings?tab=accounts', '_blank');
                          }}
                        />
                        {paymentSectionVisible && !financialAccountsLoading && financialAccounts.length === 0 && (
                          <p className="mt-2 text-xs text-orange-600">
                            No financial accounts are configured yet. Add one from Settings → Financial Accounts to track payments accurately.
                          </p>
                        )}
                        {paymentSectionVisible && financialAccounts.length > 0 && !formData.financialAccountId && (
                          <p className="mt-2 text-xs text-orange-600">
                            Select a managed financial account so this payment posts against the correct balance.
                          </p>
                        )}
                        {!formData.financialAccountId && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bank Account (Legacy)
                            </label>
                            <select
                              name="bankAccount"
                              value={formData.bankAccount}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {bankAccounts.map(account => (
                                <option key={account} value={account}>{account}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Method
                        </label>
                        <select
                          name="paymentMethod"
                          value={formData.paymentMethod}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {paymentMethods.map(method => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                        {(formData.paymentMethod === 'Debit Card' || formData.paymentMethod === 'Credit Card') && (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Card Details (Optional)
                            </label>
                            <input
                              type="text"
                              name="paymentMethodDetails"
                              value={formData.paymentMethodDetails}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., MC #5248***2552, Visa #4532****1234"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter card type and last 4 digits (e.g., MC #5248***2552)
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Paid Date
                        </label>
                        <input
                          type="date"
                          name="paidDate"
                          value={formData.paidDate}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use the date the payment cleared or the receipt was issued.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 text-sm text-blue-700 rounded-md px-3 py-3">
                      Mark the expense as <span className="font-semibold">Paid</span> to record payment
                      details and update linked account balances. Until then the invoice remains open.
                    </div>
                  )}
              </div>

              <div className="overflow-y-auto pr-2 lg:max-h-[72vh]">
                <AttachmentPanel
                  selectedFiles={selectedFiles}
                  onFilesChange={setSelectedFiles}
                  previewItems={previewItems}
                  existingAttachments={existingAttachments}
                  currentPreviewId={currentPreviewId}
                  setCurrentPreviewId={setCurrentPreviewId}
                  zoomLevel={zoomLevel}
                  setZoomLevel={setZoomLevel}
                  notesValue={formData.notes}
                  onNotesChange={(value) => setFormData(prev => ({ ...prev, notes: value }))}
                  documentType={formData.documentType}
                  onDocumentTypeChange={(value) => setFormData(prev => ({ ...prev, documentType: value }))}
                  paymentStatus={formData.paymentStatus}
                  onPaymentStatusChange={(value) => setFormData(prev => ({ ...prev, paymentStatus: value }))}
                  autoFillStatus={autoFillStatus}
                  autoFillMessage={autoFillMessage}
                  autoFillProgress={autoFillProgress}
                  className="h-full"
                />
              </div>
            </div>

            {uploadingFiles && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">
                    Uploading files...
                  </span>
                  <span className="text-sm text-blue-600">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            </form>
          </div>
        </div>
      )}

      {showNormalizeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Normalize currency to EUR</h3>
                <p className="text-sm text-gray-500">
                  Convert {normalizeStatus.total} expense{normalizeStatus.total === 1 ? '' : 's'} currently stored in other currencies.
                </p>
              </div>
                <button
                  type="button"
                  onClick={() => {
                  if (!normalizationRunning) {
                    setShowNormalizeModal(false);
                  }
                  }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                disabled={normalizationRunning}
                title="Close"
                >
                <FaTimes className="w-4 h-4" />
                </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {Object.keys(conversionSummary).length > 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Detected currencies</p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {Object.entries(conversionSummary).map(([currency, count]) => (
                      <li key={currency} className="flex items-center justify-between">
                        <span>{currency}</span>
                        <span className="font-semibold">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No non-EUR expenses detected.</p>
              )}

              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{normalizeStatus.processed} / {normalizeStatus.total}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${normalizeStatus.state === 'error' ? 'bg-red-500' : 'bg-blue-600'} transition-all duration-300`}
                    style={{ width: `${normalizeProgressPercent}%` }}
                  />
                </div>
                {normalizationRunning && (
                  <p className="text-xs text-blue-600 mt-2">Converting… this may take a few seconds.</p>
                )}
                {normalizeStatus.state === 'success' && (
                  <p className="text-xs text-green-600 mt-2">Currency normalization complete.</p>
                )}
                {normalizeStatus.state === 'error' && normalizeStatus.errors.length === 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    Currency normalization finished with warnings.
                  </p>
                )}
              </div>

              {normalizeStatus.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-auto">
                  <p className="text-sm font-medium text-red-700 mb-2">Issues encountered</p>
                  <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
                    {normalizeStatus.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t flex items-center justify-end gap-3 bg-gray-50 rounded-b-2xl">
                <button
                type="button"
                onClick={() => {
                  if (!normalizationRunning) {
                    setShowNormalizeModal(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                disabled={normalizationRunning}
              >
                {normalizeStatus.state === 'success' || normalizeStatus.state === 'error' ? 'Close' : 'Cancel'}
                </button>
              {normalizeStatus.state === 'idle' && (
                <button
                  type="button"
                  onClick={handleNormalizeCurrency}
                  className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition"
                >
                  Convert to EUR
                </button>
              )}
              {normalizeStatus.state === 'running' && (
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-semibold text-white bg-purple-400 rounded-lg shadow-sm cursor-not-allowed"
                  disabled
                >
                  Converting…
                </button>
              )}
              {(normalizeStatus.state === 'success' || (normalizeStatus.state === 'error' && normalizeStatus.errors.length > 0)) && (
                <button
                  type="button"
                  onClick={() => {
                    setShowNormalizeModal(false);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Done
                </button>
              )}
              </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-4 lg:space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            // Skeleton loading state for summary cards
            <>
              <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-28"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Expense</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                  </div>
                  <FaChartLine className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total VAT</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalVAT)}</p>
                  </div>
                  <FaFileAlt className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
                  </div>
                  <FaFileAlt className="w-8 h-8 text-gray-600" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filters and Actions Section */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            // Skeleton for filters
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-4 flex-1">
                  <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Filters Section */}
              <div className="p-4 border-b border-gray-200">
                <div className="space-y-3">
                  {/* Row 1: Time, Category, Financial Account, Payment Method, Vendor */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1">Time Period</label>
                      <select
                        value={filters.periodType}
                        onChange={(e) => {
                          const newPeriodType = e.target.value;
                          if (newPeriodType === 'custom') {
                            setFilters({...filters, periodType: 'custom'});
                          } else {
                            setFilters({...filters, periodType: newPeriodType});
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1">Category</label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1">Financial Account</label>
                      <select
                        value={filters.financialAccountId}
                        onChange={(e) => setFilters({...filters, financialAccountId: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                        disabled={financialAccountsLoading}
                      >
                        <option value="all">All Financial Accounts</option>
                        {financialAccountFilterOptionsWithLegacy.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1">Payment Method</label>
                      <select
                        value={filters.paymentMethod}
                        onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                      >
                        <option value="all">All Payment Methods</option>
                        {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1">Vendor</label>
                      <select
                        value={filters.vendor}
                        onChange={(e) => setFilters({...filters, vendor: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                      >
                        <option value="all">All Vendors</option>
                        {vendorOptions.map((vendorName) => (
                          <option key={vendorName} value={vendorName}>
                            {vendorName}
                          </option>
                        ))}
                        {vendorHasMissing && (
                          <option value="__missing__">Missing Vendor</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Custom Date Range (shown when custom is selected) - Full width row */}
                  {filters.periodType === 'custom' && (
                    <div className="grid grid-cols-4 gap-3 items-end">
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                        />
                      </div>
                      <span className="self-end mb-2 text-gray-500 text-center">to</span>
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 uppercase mb-1">End Date</label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                        />
                      </div>
                      <div></div>
                    </div>
                  )}

                  {/* Row 2: Document Type, Payment Status, Approval Status, Clear Filters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1">Document Type</label>
                      <select
                        value={filters.documentType}
                        onChange={(e) => setFilters({...filters, documentType: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                      >
                        {documentTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1">Payment Status</label>
                      <select
                        value={filters.paymentStatus}
                        onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                      >
                        {paymentStatusOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-500 uppercase mb-1">Approval Status</label>
                      <select
                        value={filters.approvalStatus}
                        onChange={(e) => setFilters({...filters, approvalStatus: e.target.value})}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                      >
                        {approvalFilterOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    {(filters.category !== 'all' || filters.financialAccountId !== 'all' || filters.paymentMethod !== 'all' || filters.vendor !== 'all' || filters.periodType !== 'all' || filters.documentType !== 'all' || filters.paymentStatus !== 'all' || filters.approvalStatus !== 'all') && (
                      <div className="flex items-end">
                        <button
                          onClick={() => setFilters({
                            category: 'all',
                            financialAccountId: 'all',
                            paymentMethod: 'all',
                            vendor: 'all',
                            documentType: 'all',
                            paymentStatus: 'all',
                            approvalStatus: 'all',
                            periodType: 'all',
                            startDate: '',
                            endDate: ''
                          })}
                          className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="p-4 bg-gray-50 flex flex-wrap items-center gap-3">
            <div className="relative" ref={addDocumentMenuRef}>
              <div className="inline-flex rounded-lg shadow-sm overflow-hidden">
            <button
                  type="button"
                  onClick={() => handleAddDocument('invoice', 'primary')}
                  disabled={!currentCompanyId}
                  className="px-4 py-2 bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  title={!currentCompanyId ? 'Please select a company first' : 'Add a new invoice'}
                >
                  <FaPlusCircle />
                  Add Document
                </button>
                <button
                  type="button"
              onClick={() => {
                if (!currentCompanyId) {
                      alert('Please select a company to add documents.');
                  return;
                }
                    setShowAddDocumentMenu((prev) => {
                      const next = !prev;
                      trackEvent(next ? 'add_document_menu_opened' : 'add_document_menu_closed', {
                        companyId: currentCompanyId || 'unknown'
                      });
                      return next;
                    });
              }}
              disabled={!currentCompanyId}
                  aria-haspopup="menu"
                  aria-expanded={showAddDocumentMenu}
                  className="px-2 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 border-l border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!currentCompanyId ? 'Please select a company first' : 'Choose document type'}
            >
                  <FaChevronDown />
            </button>
              </div>
              {showAddDocumentMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
                  {documentTypeOptions
                    .filter(option => option.value !== 'all')
                    .map(option => {
                      const style = documentTypeStyles[option.value] || documentTypeStyles.invoice;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleAddDocument(option.value, 'dropdown')}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-blue-50 flex items-center justify-between gap-2"
                        >
                          <span>Add {style.label}</span>
                          <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${style.classes}`}>
                            {style.label}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
            
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setImportType('excel');
                    setImportedData([]);
                    setImportFile(null);
                  }}
                  disabled={!currentCompanyId}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  title={!currentCompanyId ? 'Please select a company first' : ''}
                >
                  <FaFileExcel />
                  Import Excel
                </button>
                
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setImportType('ocr');
                    setImportedData([]);
                    setImportFile(null);
                  }}
                  disabled={!currentCompanyId}
                  className="px-4 py-2 bg-[#00BFA6] text-white rounded-lg hover:bg-[#019884] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  title={!currentCompanyId ? 'Please select a company first' : ''}
                >
                  <FaFilePdf />
                  OCR Bank Statement
                </button>
                {expensesRequiringConversion.length > 0 && (
                  <button
                    onClick={() => {
                      setNormalizeStatus({
                        state: 'idle',
                        total: expensesRequiringConversion.length,
                        processed: 0,
                        skipped: 0,
                        errors: []
                      });
                      setShowNormalizeModal(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <FaSyncAlt />
                    Normalize to EUR
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-gray-500">Awaiting Approval</p>
              <p className="text-xl font-semibold text-orange-600">{approvalSummary.awaiting || 0}</p>
            </div>
            <FaClipboardCheck className="w-6 h-6 text-orange-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-gray-500">Approved</p>
              <p className="text-xl font-semibold text-green-600">{approvalSummary.approved || 0}</p>
            </div>
            <FaCalendarCheck className="w-6 h-6 text-green-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-gray-500">Draft / Rejected</p>
              <p className="text-xl font-semibold text-gray-700">{(approvalSummary.draft || 0) + (approvalSummary.rejected || 0)}</p>
            </div>
            <FaTimesCircle className="w-6 h-6 text-gray-500" />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-medium text-gray-900">All Expenses</h2>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <colgroup>
                <col style={{ width: '90px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '80px' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approval
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description & Notes
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Details
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issues
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Files
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    // Skeleton rows for loading state
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-6 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-6 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-full"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-10 mx-auto"></div></td>
                        <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
                      </tr>
                    ))
                  ) : visibleExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center gap-4">
                          {!currentCompanyId ? (
                            <>
                              <p className="text-gray-500 text-lg font-medium">Please select a company to view expenses.</p>
                              <p className="text-sm text-gray-400">Use the company selector in the header to select or create a company.</p>
                            </>
                          ) : expenses.length === 0 ? (
                            <>
                              <p className="text-gray-500">No expenses yet.</p>
                              <button
                                onClick={async () => {
                                  setIsMigrating(true);
                                  setMigrationResult(null);
                                  try {
                                    const result = await performExpenseMigration(currentCompanyId);
                                    setMigrationResult(result);
                                    if (result.success && result.migratedCount > 0) {
                                      await loadExpenses();
                                    }
                                  } catch (error) {
                                    setMigrationResult({
                                      success: false,
                                      message: `Migration failed: ${error.message}`
                                    });
                                  } finally {
                                    setIsMigrating(false);
                                  }
                                }}
                                disabled={isMigrating}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                {isMigrating ? 'Migrating Expenses...' : 'Migrate Legacy Expenses to This Company'}
                              </button>
                              {migrationResult && (
                                <p className={`text-sm ${migrationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                  {migrationResult.message}
                                </p>
                              )}
                              <p className="text-sm text-gray-400">Or click "Add Expense" to get started.</p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-500">No expenses match your current filters.</p>
                              <button
                                onClick={() => setFilters({
                                  category: 'all',
                                  financialAccountId: 'all',
                                  paymentMethod: 'all',
                                  documentType: 'all',
                                  paymentStatus: 'all',
                                  periodType: 'all',
                                  startDate: '',
                                  endDate: ''
                                })}
                                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Clear Filters
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleExpenses.map((expense) => {
                      const documentTypeKey = (expense.documentType || 'invoice').toLowerCase();
                      const documentMeta = documentTypeStyles[documentTypeKey] || documentTypeStyles.invoice;
                      const paymentStatusKey = (expense.paymentStatus || 'open').toLowerCase();
                      const paymentMeta = paymentStatusStyles[paymentStatusKey] || paymentStatusStyles.open;
                      const statementMeta = documentTypeStyles.statement;
                      const paymentAccount = expense.financialAccountId ? financialAccountLookup.get(expense.financialAccountId) : null;
                      const paymentDetailsRecorded = paymentStatusKey === 'paid' && (paymentAccount || expense.paymentMethod || expense.paymentMethodDetails);
                      const paymentDetailsLabel = paymentDetailsRecorded
                        ? (paymentAccount && !expense.paymentMethod && !expense.paymentMethodDetails
                          ? `Posted to ${paymentAccount.name}${paymentAccount.currency ? ` • ${paymentAccount.currency}` : ''}`
                          : `${expense.paymentMethod || ''} ${expense.paymentMethodDetails || ''}`.trim() || 'Payment recorded')
                        : 'No payment recorded';
                      const paymentDetailsTitle = paymentDetailsRecorded
                        ? (expense.paymentMethod || expense.paymentMethodDetails
                          ? `${expense.paymentMethod || ''} ${expense.paymentMethodDetails || ''}`.trim()
                          : (paymentAccount
                              ? `Payment routed via ${paymentAccount.name}`
                              : 'Payment recorded'))
                        : 'No payment recorded';
                      const linkedInvoice = linkedInvoicesByReceipt.get(expense.id);
                      const linkedStatement = linkedStatementsByReceipt.get(expense.id);
                      const hasLinkedInvoice = Boolean(linkedInvoice);
                      const hasLinkedStatement = Boolean(linkedStatement);
                      const hasLinkedDocuments = hasLinkedInvoice || hasLinkedStatement;
                      const isExpanded = hasLinkedDocuments && expandedLinkedReceipts.has(expense.id);
                      const statementConfidence = typeof expense.linkedStatementMatchConfidence === 'number'
                        ? Math.round(expense.linkedStatementMatchConfidence * 100)
                        : null;
                      const conversionMeta = expense.conversionMeta || null;
                      const approvalStatus = (expense.approvalStatus || 'draft').toLowerCase();
                      const approvalMeta = approvalStatusStyles[approvalStatus] || approvalStatusStyles.draft;
                      const normalizedAmount = Number.isFinite(parseFloat(expense.amount))
                        ? parseFloat(expense.amount)
                        : null;
                      const conversionSummary = conversionMeta
                        ? [
                            `${formatCurrencyFor(conversionMeta.originalAmount, conversionMeta.originalCurrency)} → ${normalizedAmount !== null ? formatCurrency(normalizedAmount) : 'EUR'}`,
                            `Rate ${Number.isFinite(conversionMeta.conversionRate) ? conversionMeta.conversionRate.toFixed(4) : '—'}`,
                            conversionMeta.rateDateUsed ? `Rate date ${formatDateTime(conversionMeta.rateDateUsed, { dateStyle: 'medium' })}` : null,
                            conversionMeta.conversionSource ? `Source ${conversionMeta.conversionSource}` : null
                          ].filter(Boolean).join(' • ')
                        : null;
                      const dueDateLabel = expense.dueDate ? formatDateTime(expense.dueDate, { dateStyle: 'medium' }) : null;
                      const scheduledPaymentLabel = expense.scheduledPaymentDate
                        ? formatDateTime(expense.scheduledPaymentDate, { dateStyle: 'medium' })
                        : null;
                      const contractDetailsForRow = expense.contractSnapshot
                        || (expense.contractName || expense.contractReference || expense.contractUrl
                          ? {
                              name: expense.contractName || '',
                              reference: expense.contractReference || '',
                              vendorName: expense.contractVendorName || '',
                              status: expense.contractStatus || '',
                              startDate: expense.contractStartDate || '',
                              endDate: expense.contractEndDate || '',
                              currency: expense.contractCurrency || '',
                              value: Number.isFinite(parseFloat(expense.contractValue)) ? parseFloat(expense.contractValue) : null,
                              url: expense.contractUrl || ''
                            }
                          : null);
                      
                      // Ensure contractDetailsForRow.value is safely accessible
                      const contractValue = contractDetailsForRow && typeof contractDetailsForRow.value === 'number' ? contractDetailsForRow.value : null;

                      const timelineEvents = [];
                      if (expense.createdAt) {
                        timelineEvents.push({
                          icon: <FaReceipt className="w-3.5 h-3.5" />,
                          label: 'Receipt captured',
                          at: expense.createdAt,
                          userId: expense.createdBy,
                          meta: expense.paymentMethod
                            ? `Method: ${expense.paymentMethodDetails || expense.paymentMethod}`
                            : null
                        });
                      }
                      if (conversionMeta) {
                        timelineEvents.push({
                          icon: <FaSyncAlt className="w-3.5 h-3.5" />,
                          label: 'Currency normalized',
                          at: conversionMeta.convertedAt || expense.updatedAt || expense.date,
                          meta: conversionSummary
                        });
                      }
                      if (expense.approvalRequestedAt) {
                        timelineEvents.push({
                          icon: <FaClipboardCheck className="w-3.5 h-3.5" />,
                          label: 'Approval requested',
                          at: expense.approvalRequestedAt,
                          meta: expense.approvalNotes || null
                        });
                      }
                      if (expense.approvedAt) {
                        timelineEvents.push({
                          icon: <FaCalendarCheck className="w-3.5 h-3.5" />,
                          label: 'Approved',
                          at: expense.approvedAt,
                          meta: expense.approvalNotes || null
                        });
                      } else if (approvalStatus === 'rejected') {
                        timelineEvents.push({
                          icon: <FaTimesCircle className="w-3.5 h-3.5" />,
                          label: 'Rejected',
                          at: expense.updatedAt || expense.date,
                          meta: expense.approvalNotes || null
                        });
                      }
                      if (expense.dueDate) {
                        timelineEvents.push({
                          icon: <FaClock className="w-3.5 h-3.5" />,
                          label: 'Invoice due',
                          at: expense.dueDate,
                          meta: null
                        });
                      }
                      if (expense.scheduledPaymentDate) {
                        timelineEvents.push({
                          icon: <FaCalendarCheck className="w-3.5 h-3.5" />,
                          label: 'Payment scheduled',
                          at: expense.scheduledPaymentDate,
                          meta: expense.paymentScheduleNotes || null
                        });
                      }
                      if (hasLinkedInvoice && linkedInvoice.createdAt) {
                        timelineEvents.push({
                          icon: <FaFileInvoiceDollar className="w-3.5 h-3.5" />,
                          label: 'Invoice recorded',
                          at: linkedInvoice.createdAt,
                          userId: linkedInvoice.createdBy,
                          meta: linkedInvoice.invoiceNumber ? `Number: ${linkedInvoice.invoiceNumber}` : null
                        });
                      }

                      const hasValidationErrors = Array.isArray(expense.validationErrors) && expense.validationErrors.length > 0;
                      const isDuplicateRow = !hasValidationErrors && expense.isDuplicate;
                      const rowTone = hasValidationErrors
                        ? 'bg-red-50/80'
                        : isDuplicateRow
                          ? 'bg-yellow-50/60'
                          : '';
                      const amountToDisplay = Number.isFinite(expense.parsedAmount)
                        ? expense.parsedAmount
                        : parseNumericAmount(String(expense.amount || ''));

                      return (
                        <React.Fragment key={expense.id}>
                          <tr className={`hover:bg-gray-50 ${rowTone}`}>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDateTime(expense.date, { dateStyle: 'medium' })}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900">
                          <div className="break-words">
                            <p className="truncate font-medium" title={expense.vendor}>
                              {expense.vendor || '—'}
                            </p>
                            {(expense.invoiceNumber || expense.invoiceDate) && (
                              <p className="mt-1 text-xs text-gray-500 truncate">
                                {expense.invoiceNumber ? `Invoice ${expense.invoiceNumber}` : ''}
                                {expense.invoiceDate ? ` • ${formatDateTime(expense.invoiceDate, { dateStyle: 'medium' })}` : ''}
                              </p>
                            )}
                            {(expense.contractName || expense.contractReference) && (
                              <p className="mt-1 text-xs text-purple-600 truncate">
                                Contract: {expense.contractName || expense.contractReference}
                              </p>
                            )}
                          </div>
                        </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${documentMeta.classes}`}>
                                  {documentMeta.label}
                                </span>
                                {hasLinkedStatement && (
                                  <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                    Bank Proof
                                  </span>
                                )}
                                {hasLinkedDocuments && (
                                  <button
                                    type="button"
                                    onClick={() => toggleLinkedReceipt(expense.id)}
                                    className="p-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                                    title={isExpanded ? 'Hide linked documents' : 'Show linked documents'}
                                  >
                                    <FaChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                          </div>
                        </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm">
                              <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${paymentMeta.classes}`}>
                                {paymentMeta.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${approvalMeta.classes}`}>
                                  {approvalMeta.label}
                                </span>
                                {expense.approvalAssigneeId && (() => {
                                  const assignee = companyMembers.find(m => m.userId === expense.approvalAssigneeId);
                                  const initials = assignee ? (assignee.displayName || assignee.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
                                  return (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                                        {initials}
                                      </div>
                                      <span className="text-xs text-gray-600 truncate" title={assignee ? (assignee.displayName || assignee.email) : 'Unknown'}>
                                        {assignee ? (assignee.displayName || assignee.email) : 'Unknown'}
                                      </span>
                                    </div>
                                  );
                                })()}
                                {dueDateLabel && (
                                  <span className="text-xs text-gray-500">Due {dueDateLabel}</span>
                                )}
                                {scheduledPaymentLabel && (
                                  <span className="text-xs text-gray-500">Scheduled {scheduledPaymentLabel}</span>
                                )}
                              </div>
                            </td>
                        <td className="px-3 py-3 text-sm text-gray-900">
                          <div className="break-words space-y-2">
                            <div className="space-y-1">
                              <p className="whitespace-pre-wrap break-words leading-snug font-medium text-gray-900">
                                {expense.description}
                              </p>
                              {expense.notes && (
                                <p className="text-xs text-gray-500 whitespace-pre-wrap break-words">
                                  {expense.notes}
                                </p>
                              )}
                            </div>
                            {conversionMeta && (
                              <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-md px-2 py-2 space-y-1">
                                <p className="font-semibold flex items-center gap-1">
                                  <FaSyncAlt className="w-3.5 h-3.5" />
                                  Currency normalized
                                </p>
                                <p>
                                  {formatCurrencyFor(conversionMeta.originalAmount, conversionMeta.originalCurrency)} → {normalizedAmount !== null ? formatCurrency(normalizedAmount) : 'EUR'}
                                </p>
                                <p>
                                  Rate {Number.isFinite(conversionMeta.conversionRate) ? conversionMeta.conversionRate.toFixed(4) : '—'} • {conversionMeta.rateDateUsed ? `Rate date ${formatDateTime(conversionMeta.rateDateUsed, { dateStyle: 'medium' })}` : 'Rate date unknown'}
                                </p>
                                <p>
                                  Source {conversionMeta.conversionSource || 'Unknown'}{conversionMeta.convertedAt ? ` • Converted ${formatDateTime(conversionMeta.convertedAt, { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600">
                          <div className="break-words space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <FaCreditCard className="w-3 h-3 text-gray-400" />
                              <span className="truncate">
                                {paymentAccount
                                  ? `${paymentAccount.name}${paymentAccount.currency ? ` • ${paymentAccount.currency}` : ''}`
                                  : (expense.bankAccount && expense.bankAccount.toLowerCase() !== 'financial account'
                                      ? expense.bankAccount
                                      : 'No account recorded')}
                              </span>
                            </div>
                            {!paymentAccount && expense.financialAccountId && (
                              <span className="text-xs text-orange-600 block">
                                Account unavailable. Check Settings → Financial Accounts.
                              </span>
                            )}
                            <div className="text-xs truncate" title={paymentDetailsTitle}>
                              {paymentDetailsLabel}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              {Number.isFinite(amountToDisplay) ? formatCurrency(amountToDisplay) : '-'}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {hasValidationErrors ? (
                            <div className="space-y-1 text-red-600">
                              {expense.validationErrors.map((error, idx) => (
                                <p key={idx}>{error}</p>
                              ))}
                            </div>
                          ) : isDuplicateRow ? (
                            <span className="text-yellow-700">
                              Duplicate detected (already captured).
                            </span>
                          ) : (
                            <span className="text-green-600">Ready to import</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm">
                          {expense.attachments && expense.attachments.length > 0 ? (
                            <button
                              onClick={() => handleViewAttachments(expense)}
                              className="inline-flex items-center text-blue-600 hover:text-blue-900"
                            >
                              <FaPaperclip className="w-4 h-4 mr-1" />
                              <span>{expense.attachments.length}</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center gap-2">
                            {documentTypeKey === 'invoice' && paymentStatusKey !== 'paid' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddDocument('receipt', {
                                    vendor: expense.vendor,
                                    vendorAddress: expense.vendorAddress,
                                    vendorCountry: expense.vendorCountry,
                                    invoiceNumber: expense.invoiceNumber,
                                    amount: expense.amount,
                                    currency: expense.currency,
                                    category: expense.category,
                                    description: expense.description,
                                    invoiceDate: expense.invoiceDate || expense.date,
                                    dueDate: expense.dueDate || '',
                                    paidDate: expense.paidDate,
                                    paymentMethod: expense.paymentMethod,
                                    paymentMethodDetails: expense.paymentMethodDetails,
                                    financialAccountId: expense.financialAccountId,
                                    bankAccount: expense.financialAccountId ? 'Financial Account' : expense.bankAccount,
                                    contractId: expense.contractId || '',
                                    contractName: expense.contractName || '',
                                    contractVendorId: expense.contractVendorId || '',
                                    contractSnapshot: expense.contractSnapshot || null,
                                    contractReference: expense.contractReference || '',
                                    contractUrl: expense.contractUrl || ''
                                  })}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold shadow-sm hover:bg-blue-100 hover:border-blue-300 transition"
                                  title="Add receipt for this invoice"
                                >
                                  <FaReceipt className="w-3.5 h-3.5" />
                                  <span>Receipt</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddDocument('statement', {
                                    vendor: expense.vendor,
                                    vendorAddress: expense.vendorAddress,
                                    vendorCountry: expense.vendorCountry,
                                    invoiceNumber: expense.invoiceNumber,
                                    amount: expense.amount,
                                    currency: expense.currency,
                                    category: expense.category,
                                    description: expense.description,
                                    paidDate: expense.paidDate,
                                    paymentMethod: expense.paymentMethod,
                                    paymentMethodDetails: expense.paymentMethodDetails,
                                    financialAccountId: expense.financialAccountId,
                                    bankAccount: expense.financialAccountId ? 'Financial Account' : expense.bankAccount,
                                    contractId: expense.contractId || '',
                                    contractName: expense.contractName || '',
                                    contractVendorId: expense.contractVendorId || '',
                                    contractSnapshot: expense.contractSnapshot || null,
                                    contractReference: expense.contractReference || '',
                                    contractUrl: expense.contractUrl || ''
                                  })}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold shadow-sm hover:bg-teal-100 hover:border-teal-300 transition"
                                  title="Add bank statement entry"
                                >
                                  <FaFilePdf className="w-3.5 h-3.5" />
                                  <span>Statement</span>
                                </button>
                              </>
                            )}
                          <button
                            onClick={() => handleEditExpense(expense)}
                              className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <FaEdit className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4 inline" />
                          </button>
                          </div>
                        </td>
                      </tr>
                          {hasLinkedDocuments && isExpanded && (
                            <tr>
                              <td colSpan="10" className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                <div className="flex flex-col gap-4">
                                  {conversionMeta && (
                                    <section className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm">
                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                          <p className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                                            <FaSyncAlt className="w-4 h-4" />
                                            Currency normalization
                                          </p>
                                          <p className="text-xs text-indigo-600 mt-1">
                                            Converted {formatCurrencyFor(conversionMeta.originalAmount, conversionMeta.originalCurrency)} to {normalizedAmount !== null ? formatCurrency(normalizedAmount) : 'EUR'} on {formatDateTime(conversionMeta.convertedAt || expense.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                                          </p>
                                        </div>
                                        <span className="px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                                          {conversionMeta.conversionSource || 'Unknown source'}
                                        </span>
                                      </div>
                                      <div className="grid md:grid-cols-3 gap-3 text-sm text-indigo-800 mt-3">
                                        <div>
                                          <span className="block text-xs uppercase text-indigo-500">Requested date</span>
                                          <span>{conversionMeta.requestedDate ? formatDateTime(conversionMeta.requestedDate, { dateStyle: 'medium' }) : '—'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-indigo-500">Rate date</span>
                                          <span>{conversionMeta.rateDateUsed ? formatDateTime(conversionMeta.rateDateUsed, { dateStyle: 'medium' }) : 'Latest available'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-indigo-500">Rate applied</span>
                                          <span>{Number.isFinite(conversionMeta.conversionRate) ? conversionMeta.conversionRate.toFixed(6) : '—'}</span>
                                        </div>
                                      </div>
                                    </section>
                                  )}
                                  {(expense.approvalStatus || expense.approvalNotes || expense.approvalRequestedAt || expense.approvedAt || expense.approvalAssigneeId || expense.approvalChecklist) && (
                                    <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-gray-800">Approval Workflow</h4>
                                        {expense.approvalStatus === 'awaiting' && expense.approvalAssigneeId && (
                                          <button
                                            onClick={async () => {
                                              try {
                                                await updateCompanyExpense(currentCompanyId, expense.id, {
                                                  lastApprovalReminderAt: new Date().toISOString()
                                                });
                                                await loadExpenses();
                                                trackEvent('approval_reminder_sent', {
                                                  expenseId: expense.id,
                                                  assigneeId: expense.approvalAssigneeId,
                                                  companyId: currentCompanyId
                                                });
                                              } catch (error) {
                                                console.error('Error sending reminder:', error);
                                                alert('Failed to send reminder. Please try again.');
                                              }
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors flex items-center gap-1.5"
                                          >
                                            <FaBell className="w-3 h-3" />
                                            Send Reminder
                                          </button>
                                        )}
                                      </div>
                                      <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Status</span>
                                          <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${approvalMeta.classes}`}>
                                            {approvalMeta.label}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Requested</span>
                                          <span>{expense.approvalRequestedAt ? formatDateTime(expense.approvalRequestedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Approved</span>
                                          <span>{expense.approvedAt ? formatDateTime(expense.approvedAt, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                                        </div>
                                      </div>
                                      {expense.approvalAssigneeId && (
                                        <div className="mt-3">
                                          <span className="block text-xs uppercase text-gray-400 mb-1">Assigned To</span>
                                          <div className="flex items-center gap-2">
                                            {(() => {
                                              const assignee = companyMembers.find(m => m.userId === expense.approvalAssigneeId);
                                              const initials = assignee ? (assignee.displayName || assignee.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
                                              return (
                                                <>
                                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                                                    {initials}
                                                  </div>
                                                  <span className="text-sm text-gray-700">
                                                    {assignee ? (assignee.displayName || assignee.email) : 'Unknown user'}
                                                  </span>
                                                </>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                      {Array.isArray(expense.approvalChecklist) && expense.approvalChecklist.length > 0 && (
                                        <div className="mt-3">
                                          <span className="block text-xs uppercase text-gray-400 mb-2">Checklist</span>
                                          <div className="space-y-1.5">
                                            {expense.approvalChecklist.map((item, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-sm">
                                                <span className={item.status === 'completed' ? 'text-green-600' : 'text-gray-400'}>
                                                  {item.status === 'completed' ? '✓' : '○'}
                                                </span>
                                                <span className={item.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-700'}>
                                                  {item.title || `Item ${idx + 1}`}
                                                </span>
                                                {item.completedAt && (
                                                  <span className="text-xs text-gray-400 ml-auto">
                                                    {formatDateTime(item.completedAt, { dateStyle: 'short', timeStyle: 'short' })}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {expense.approvalNotes && (
                                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-3">
                                          <span className="block text-xs uppercase text-gray-400 mb-1">Notes</span>
                                          <p className="whitespace-pre-wrap">{expense.approvalNotes}</p>
                                        </div>
                                      )}
                                      {expense.lastApprovalReminderAt && (
                                        <div className="mt-2 text-xs text-gray-500">
                                          Last reminder: {formatDateTime(expense.lastApprovalReminderAt, { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                      )}
                                    </section>
                                  )}
                                  {(() => {
                                    // Only show Scheduling & Contracts for future/open expenses, not for past/paid ones
                                    const isPaid = (expense.paymentStatus || '').toLowerCase() === 'paid';
                                    const expenseDate = expense.date ? new Date(expense.date) : null;
                                    const isPastExpense = expenseDate && expenseDate < new Date();
                                    const hasFutureScheduling = expense.scheduledPaymentDate && new Date(expense.scheduledPaymentDate) > new Date();
                                    const hasContractInfo = contractDetailsForRow || expense.contractReference || expense.contractUrl;
                                    
                                    // Show only if: not paid AND (has future scheduling OR has contract info OR has future due date)
                                    const shouldShow = !isPaid && (
                                      hasFutureScheduling || 
                                      hasContractInfo || 
                                      (expense.dueDate && new Date(expense.dueDate) > new Date())
                                    ) && (expense.dueDate || expense.scheduledPaymentDate || expense.paymentScheduleNotes || expense.contractReference || expense.contractUrl || contractDetailsForRow);
                                    
                                    return shouldShow ? (
                                      <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Scheduling & Contracts</h4>
                                      <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Due date</span>
                                          <span>{expense.dueDate ? formatDateTime(expense.dueDate, { dateStyle: 'medium' }) : '—'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Scheduled payment</span>
                                          <span>{expense.scheduledPaymentDate ? formatDateTime(expense.scheduledPaymentDate, { dateStyle: 'medium' }) : '—'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Linked contract</span>
                                          <span>{contractDetailsForRow?.name || contractDetailsForRow?.reference || '—'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Contract status</span>
                                          <span>{contractDetailsForRow?.status || '—'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Contract term</span>
                                          <span>
                                            {contractDetailsForRow?.startDate || '—'} – {contractDetailsForRow?.endDate || '—'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Contract reference</span>
                                          <span>{expense.contractReference || '—'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs uppercase text-gray-400">Contract link</span>
                                          {expense.contractUrl ? (
                                            <a href={expense.contractUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 break-all">
                                              {expense.contractUrl}
                                            </a>
                                          ) : (
                                            <span>—</span>
                                          )}
                                        </div>
                                        {contractValue !== null && contractDetailsForRow && (
                                          <div>
                                            <span className="block text-xs uppercase text-gray-400">Contract value</span>
                                            <span>{contractValue} {contractDetailsForRow.currency || ''}</span>
                                          </div>
                                        )}
                                      </div>
                                      {expense.paymentScheduleNotes && (
                                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-3">
                                          <span className="block text-xs uppercase text-gray-400 mb-1">Payment notes</span>
                                          <p className="whitespace-pre-wrap">{expense.paymentScheduleNotes}</p>
                                        </div>
                                      )}
                                    </section>
                                    ) : null;
                                  })()}
                                  {timelineEvents.length > 0 && (
                                    <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                      <p className="text-sm font-semibold text-gray-800">Audit trail</p>
                                      <ol className="mt-3 space-y-3">
                                        {timelineEvents.map((event, idx) => (
                                          <li key={idx} className="flex items-start gap-3">
                                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600">
                                              {event.icon}
                                            </span>
                                            <div>
                                              <p className="text-sm font-medium text-gray-800">{event.label}</p>
                                              <p className="text-xs text-gray-500">
                                                {event.at ? formatDateTime(event.at) : '—'} • {event.userId ? resolveUserName(event.userId) : 'System'}
                                              </p>
                                              {event.meta && (
                                                <p className="text-xs text-gray-400">
                                                  {event.meta}
                                                </p>
                                              )}
                                            </div>
                                          </li>
                                        ))}
                                      </ol>
                                    </section>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  {importType === 'excel' ? (
                    <>
                      <FaFileExcel className="text-green-600" />
                      Import Expenses from Excel
                    </>
                  ) : (
                    <>
                      <FaFilePdf className="text-[#005C70]" />
                      Import from Bank Statement (OCR)
                    </>
                  )}
                </h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportedData([]);
                    setImportFile(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto">
              {importedData.length === 0 ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    {importType === 'excel' ? (
                      <>
                        <FaFileExcel className="w-12 h-12 text-green-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">Upload your Excel file (.xlsx or .xls)</p>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setImportFile(file);
                              handleExcelImport(file);
                            }
                          }}
                          className="hidden"
                          id="excel-file-input"
                        />
                        <label
                          htmlFor="excel-file-input"
                          className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                        >
                          Choose File
                        </label>
                      </>
                    ) : (
                      <>
                        <FaFilePdf className="w-12 h-12 text-[#4BBFAE] mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">Upload bank statement (PDF or Image)</p>
                        {ocrProcessing ? (
                          <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-700">
                                  Processing OCR...
                                </span>
                                <span className="text-sm text-blue-600">
                                  {Math.round(importProgress)}%
                                </span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${importProgress}%` }}
                                />
                              </div>
                            </div>
                            <p className="text-sm text-gray-500">Extracting transaction data from bank statement...</p>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  setImportFile(file);
                                  handleOCRImport(file);
                                }
                              }}
                              className="hidden"
                              id="ocr-file-input"
                            />
                            <label
                              htmlFor="ocr-file-input"
                              className="inline-block px-6 py-3 bg-[#00BFA6] text-white rounded-lg hover:bg-[#019884] transition-colors cursor-pointer"
                            >
                              Choose File
                            </label>
                          </>
                        )}
                      </>
                    )}
                    {importFile && !ocrProcessing && (
                      <p className="mt-4 text-sm text-gray-600">
                        Selected: {importFile.name}
                      </p>
                    )}
                  </div>
                  
                  {importType === 'excel' ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Expected Excel Format:</p>
                      <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                        <li>Date, Category, Vendor/Service, Description, Amount (EUR), Payment Method, Notes</li>
                        <li>Payment Method can include card details (e.g., "MC #5248***2552")</li>
                        <li>First row should contain column headers</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-[#F0FBF8] border border-[#B8E5DC] rounded-lg p-4">
                      <p className="text-sm font-semibold text-[#153A3F] mb-2">Bank Statement OCR:</p>
                      <ul className="text-xs text-[#184E55] space-y-1 list-disc list-inside">
                        <li>Supports PDF and image formats (PNG, JPG)</li>
                        <li>Automatically extracts dates, amounts, vendors, and card numbers</li>
                        <li>Works best with clear, high-quality scans</li>
                        <li>Review extracted data before importing</li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg p-4 border flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Found {importDiagnostics.total} expenses to import
                        </p>
                        <p className="text-xs text-gray-600">
                          Ready: {importDiagnostics.ready} • Duplicates: {importDiagnostics.duplicates} • Issues: {importDiagnostics.errors}
                        </p>
                      </div>
                      {importDiagnostics.errors > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadImportErrors(importDiagnostics.errorRows)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                        >
                          Download error report
                        </button>
                      )}
                    </div>
                    {importDiagnostics.errors > 0 && (
                      <p className="text-xs text-red-600">
                        Fix highlighted rows before importing. Rows missing a date, vendor, or amount will be skipped.
                      </p>
                    )}
                  </div>

                  <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b text-left text-xs font-semibold text-gray-600 uppercase">
                          <th className="px-3 py-2 w-20">Row</th>
                          <th className="px-3 py-2 w-32">Date</th>
                          <th className="px-3 py-2 w-24">Category</th>
                          <th className="px-3 py-2 w-48">Vendor</th>
                          <th className="px-3 py-2 min-w-[220px]">Description</th>
                          <th className="px-3 py-2 w-32 text-right">Amount</th>
                          <th className="px-3 py-2 w-48">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedData.slice(0, 200).map((expense, idx) => {
                          const hasErrors = expense.validationErrors?.length > 0;
                          const isDuplicate = expense.isDuplicate && !hasErrors;
                          const rowIssues = hasErrors ? expense.validationErrors : (isDuplicate ? ['Duplicate detected (skipped).'] : []);
                          return (
                            <tr
                              key={idx}
                              className={`border-b ${
                                hasErrors
                                  ? 'bg-red-50/70 hover:bg-red-100/80'
                                  : isDuplicate
                                    ? 'bg-yellow-50/70 hover:bg-yellow-100/80'
                                    : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="px-3 py-2 text-xs text-gray-500 font-medium">
                                {expense.rowIndex || idx + 1}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-800">
                                {expense.date || expense.invoiceDate || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-800">
                                {expense.category || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-800">
                                <span className="block truncate max-w-[180px]" title={expense.vendor || '-'}>
                                  {expense.vendor || '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700">
                                <span className="block break-words whitespace-pre-wrap max-w-xl">
                                  {expense.description || '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-sm text-gray-800">
                                {Number.isFinite(expense.parsedAmount)
                                  ? formatCurrency(expense.parsedAmount)
                                  : '—'}
                              </td>
                              <td className="px-3 py-2">
                                {rowIssues.length > 0 ? (
                                  <ul className="space-y-1 text-xs text-red-600 list-disc list-inside">
                                    {rowIssues.map((issue, issueIdx) => (
                                      <li key={issueIdx}>{issue}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-xs text-green-600">Ready</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {importedData.length > 200 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Showing first 200 of {importedData.length} rows. Use the error report for the full list.
                      </p>
                    )}
                  </div>

                  {importing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">
                          Importing expenses...
                        </span>
                        <span className="text-sm text-blue-600">
                          {Math.round(importProgress)}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportedData([]);
                  setImportFile(null);
                }}
                disabled={importing}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {importedData.length === 0 ? 'Cancel' : 'Cancel'}
              </button>
              {importedData.length > 0 && (
                <button
                  onClick={handleBulkImport}
                  disabled={importing}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FaUpload />
                  {importing ? 'Importing...' : `Import All (${importedData.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {showAttachmentsModal && viewingExpense && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Attachments - {viewingExpense.vendor}
                </h3>
                <button
                  onClick={() => {
                    setShowAttachmentsModal(false);
                    setViewingExpense(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {viewingExpense.description} - €{parseFloat(viewingExpense.amount).toFixed(2)}
              </p>
            </div>

            <div className="px-6 py-4">
              {viewingExpense.attachments && viewingExpense.attachments.length > 0 ? (
                <div className="space-y-3">
                  {viewingExpense.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {attachment.fileType === 'application/pdf' ? (
                          <FaFileAlt className="w-8 h-8 text-red-500 flex-shrink-0" />
                        ) : (
                          <FaFileAlt className="w-8 h-8 text-blue-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.fileSize / 1024).toFixed(1)} KB • {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        {attachment.fileType.startsWith('image/') && (
                          <a
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                          >
                            View
                          </a>
                        )}
                        <a
                          href={attachment.fileUrl}
                          download={attachment.fileName}
                          className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <FaDownload className="w-4 h-4 inline mr-1" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No attachments for this expense.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAttachmentsModal(false);
                  setViewingExpense(null);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ExpenseTracker;