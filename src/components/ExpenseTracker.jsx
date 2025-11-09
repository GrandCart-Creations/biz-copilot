// src/components/ExpenseTracker.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import parseExpensesWithExcelJS from '../utils/importers/exceljsExpenseParser';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {
  FaPlusCircle,
  FaChartLine,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTimes,
  FaPaperclip,
  FaDownload,
  FaFileAlt,
  FaSave,
  FaUpload,
  FaFileExcel,
  FaFilePdf,
  FaImage,
  FaSearchPlus,
  FaSearchMinus,
  FaExternalLinkAlt
} from 'react-icons/fa';
import UserProfile from './UserProfile';
import FileUpload from './FileUpload';
import CompanySelector from './CompanySelector';
import FinancialAccountSelect from './FinancialAccountSelect';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
  getCompanyExpenses,
  addCompanyExpense,
  updateCompanyExpense,
  deleteCompanyExpense,
  uploadExpenseFile,
  updateAccountBalance,
  validateVatNumber
} from '../firebase';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
const DEFAULT_ZOOM = 1.5;

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

const AttachmentPanel = ({
  label,
  selectedFiles,
  onFilesChange,
  previewItems,
  existingAttachments,
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
        <div className="flex flex-col items-center justify-center h-full text-sm text-gray-500">
          <FaPaperclip className="w-10 h-10 mb-2 text-gray-400" />
          No attachments selected yet.
        </div>
      );
    }

    if (currentPreview.type?.startsWith('image/')) {
      return (
        <div className="w-full h-full overflow-auto bg-gray-200">
          <img
            src={currentPreview.url}
            alt={currentPreview.name}
            className="max-w-none"
            style={{ transform: `scale(${clampedZoom})`, transformOrigin: 'top left' }}
          />
        </div>
      );
    }

    if (currentPreview.type === 'application/pdf') {
      const zoomValue = Math.round(clampedZoom * 100);
      const pdfSrc = `${currentPreview.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitV&zoom=${zoomValue}`;
      return (
        <iframe
          key={pdfSrc}
          src={pdfSrc}
          title={currentPreview.name}
          className="w-full h-full bg-gray-200 border-0"
          style={{ minHeight: '100%' }}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-sm text-gray-500">
        <FaFileAlt className="w-10 h-10 mb-2 text-gray-400" />
        Preview not available. Use "Open" to view this file in a new tab.
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
    <div className={`flex flex-col gap-4 pb-4 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-4 py-3 border-b bg-gray-50 sticky top-0 z-10">
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
        <div
          ref={previewContainerRef}
          className="min-h-[60vh] max-h-[72vh] bg-gray-100 overflow-auto"
        >
          {renderPreview()}
        </div>
        <div className="px-3 sm:px-4 py-3 border-t bg-white">
          {previewItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {previewItems.map(item => (
                <button
                  key={item.id}
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
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No files attached yet.</p>
          )}
        </div>
      </div>

      {showOptions && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => onDocumentTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="invoice">Invoice</option>
                <option value="receipt">Receipt</option>
                <option value="statement">Bank Statement</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => onPaymentStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="open">Open</option>
                <option value="paid">Paid</option>
                <option value="late">Late</option>
              </select>
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <FileUpload
              files={selectedFiles}
              onFilesChange={onFilesChange}
              maxFiles={5}
            />
          </div>

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

  // State Management
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false); // Start false to render UI immediately
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [currentAccountId] = useState(1);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingAttachments, setExistingAttachments] = useState([]);
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

  const getFileSignature = (file) => `${file.name}-${file.size}-${file.lastModified}`;

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
    const currencyRegexp = /(?:€|eur|usd|\$)\s*([0-9][0-9.,]*)/gi;
    let amountCandidates = [];
    for (const match of normalized.matchAll(currencyRegexp)) {
      const numeric = parseNumericAmount(match[1]);
      if (Number.isFinite(numeric)) {
        amountCandidates.push(numeric);
      }
    }
    if (amountCandidates.length === 0) {
      const genericRegexp = /\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))\b/g;
      for (const match of normalized.matchAll(genericRegexp)) {
        const numeric = parseNumericAmount(match[1]);
        if (Number.isFinite(numeric)) {
          amountCandidates.push(numeric);
        }
      }
    }
    if (amountCandidates.length > 0) {
      const highestAmount = Math.max(...amountCandidates);
      fields.amount = highestAmount.toFixed(2);
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
        const prioritizedVendor =
          cleanedBlock.find(line => /(limited|ltd|inc|llc|gmbh|s\.a\.|sarl|oy|ab|company|co\.)/i.test(line)) ||
          cleanedBlock[0];

        if (prioritizedVendor) {
          fields.vendor = prioritizedVendor;
          const vendorIndexInBlock = sanitizedBlock.indexOf(prioritizedVendor);
          const addressLines = sanitizedBlock
            .slice(vendorIndexInBlock + 1)
            .filter(line => line && !/invoice|bill to|description|qty|unit price|subtotal|total|vat/i.test(line))
            .filter((line, index, arr) => arr.indexOf(line) === index);
          if (addressLines.length) {
            fields.vendorAddress = addressLines.join(', ');
          }
        }
      }
    }

    if (!fields.vendor) {
      const vendorFallback = collapsedLines.find(line =>
        /(limited|inc|llc|bv|b\.v\.|gmbh|s\.a\.|sarl|oy|ab|ltd|plc|pte|company|co\.)/i.test(line)
      );
      if (vendorFallback) {
        fields.vendor = vendorFallback;
        const vendorIndex = collapsedLines.indexOf(vendorFallback);
        const addressCandidates = collapsedLines
          .slice(vendorIndex + 1, vendorIndex + 5)
          .filter(line => line && !/invoice|bill to|description|qty|unit price|subtotal|total|vat/i.test(line));
        if (addressCandidates.length) {
          fields.vendorAddress = addressCandidates.join(', ');
        }
      }
    }

    if (fields.vendor && !fields.vendorAddress) {
      const vendorIndex = collapsedLines.indexOf(fields.vendor);
      if (vendorIndex !== -1) {
        const addressCandidates = collapsedLines
          .slice(vendorIndex + 1, vendorIndex + 5)
          .filter(line => line && !/invoice|bill to|description|qty|unit price|subtotal|total|vat/i.test(line));
        if (addressCandidates.length) {
          fields.vendorAddress = addressCandidates.join(', ');
        }
      }
    }

    if (!fields.vendorCountry) {
      const vendorText = `${fields.vendor || ''} ${fields.vendorAddress || ''}`.toLowerCase();
      const countryMatch = EU_COUNTRY_OPTIONS.find(country => vendorText.includes(country.label.toLowerCase()));
      if (countryMatch) {
        fields.vendorCountry = countryMatch.code;
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
    assignIfEmptyOrDefault('date', extracted.date);
    assignIfEmptyOrDefault('notes', extracted.notes);
    assignIfEmptyOrDefault('vendorCountry', extracted.vendorCountry);
    assignIfEmptyOrDefault('vatNumber', extracted.vatNumber);
    assignIfEmptyOrDefault('currency', extracted.currency);

    if (extracted.amount && (!current.amount || parseFloat(current.amount) === 0 || current.amount === '0')) {
      updated.amount = extracted.amount;
    }

    if (typeof extracted.btw === 'number' && (!current.btw || current.btw === 0)) {
      updated.btw = extracted.btw;
    }

    if (extracted.documentType) {
      updated.documentType = extracted.documentType;
    }

    if (extracted.paymentStatus) {
      updated.paymentStatus = extracted.paymentStatus;
    }

    if (typeof extracted.reverseCharge === 'boolean') {
      updated.reverseCharge = extracted.reverseCharge;
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

        setFormData(prev => applySmartFillToForm(prev, extractedFields));
        setAutoFillStatus('success');
        setAutoFillMessage('Smart fill applied. Please verify the details before saving.');
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
  }, [selectedFiles, lastAutoFilledFile]);

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

  // Track last loaded company to prevent unnecessary reloads
  const lastLoadedCompanyIdRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    bankAccount: 'all',
    paymentMethod: 'all',
    periodType: 'all', // 'all', 'today', 'week', 'month', 'year', 'custom'
    startDate: '',
    endDate: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    date: todayIso,
    invoiceDate: '',
    dueDate: '',
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
    bankAccount: 'Business Checking', // Keep for backward compatibility
    financialAccountId: '', // Link to financial accounts
    paymentMethod: 'Debit Card',
    paymentMethodDetails: '',
    documentType: 'invoice',
    paymentStatus: 'open',
    vatValidationStatus: 'idle',
    vatValidatedAt: '',
    notes: ''
  });
  const [vatValidationState, setVatValidationState] = useState({
    status: 'idle',
    message: '',
    lastChecked: null
  });

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
      setExpenses(companyExpenses || []);
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
      setUploadingFiles(true);
      let expenseId;
      const payload = {
        ...formData,
        vendorCountry: formData.vendorCountry === 'OTHER' ? '' : formData.vendorCountry
      };

      payload.date = payload.date || todayIso;
      if (!payload.invoiceDate) {
        payload.invoiceDate = payload.date;
      }

      if (!currentCompanyId) {
        alert('Please select a company to add expenses.');
        setUploadingFiles(false);
        return;
      }

      if (editingExpense) {
        // Update existing expense
        expenseId = editingExpense.id;
        const oldAmount = parseFloat(editingExpense.amount || 0);
        const newAmount = parseFloat(formData.amount || 0);
        const oldAccountId = editingExpense.financialAccountId;
        const newAccountId = formData.financialAccountId;
        
        await updateCompanyExpense(currentCompanyId, expenseId, {
          ...payload,
          updatedAt: new Date().toISOString()
        });
        
        // Update account balances if financial account is linked
        if (oldAccountId && oldAccountId !== newAccountId) {
          // Account changed: reverse old, apply new
          await updateAccountBalance(currentCompanyId, oldAccountId, oldAmount, 'expense');
          if (newAccountId) {
            await updateAccountBalance(currentCompanyId, newAccountId, -newAmount, 'expense');
          }
        } else if (newAccountId && oldAmount !== newAmount) {
          // Same account, different amount: adjust difference
          const difference = oldAmount - newAmount;
          if (difference !== 0) {
            await updateAccountBalance(currentCompanyId, newAccountId, difference, 'expense');
          }
        }
      } else {
        // Add new expense
        expenseId = await addCompanyExpense(currentCompanyId, currentUser.uid, {
          ...payload,
          accountId: currentAccountId,
          createdAt: new Date().toISOString()
        });
        
        // Update account balance if financial account is linked
        if (payload.financialAccountId && payload.amount) {
          const amount = parseFloat(payload.amount || 0);
          if (amount > 0) {
            await updateAccountBalance(currentCompanyId, payload.financialAccountId, -amount, 'expense');
          }
        }
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
        await updateCompanyExpense(currentCompanyId, expenseId, {
          attachments: uploadedFiles,
          updatedAt: new Date().toISOString()
        });
      }

      // Reload expenses
      await loadExpenses();

      // Reset form
      setFormData({
        date: todayIso,
        invoiceDate: '',
        dueDate: '',
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
      setUploadProgress(0);
      setExistingAttachments([]);
      setCurrentPreviewId(null);
      setZoomLevel(DEFAULT_ZOOM);

      setShowAddExpense(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
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

  // Handle expense edit
  const handleEditExpense = (expense) => {
    setFormData({
      date: expense.date,
      invoiceDate: expense.invoiceDate || expense.date,
      dueDate: expense.dueDate || '',
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
      bankAccount: expense.bankAccount || 'Business Checking',
      financialAccountId: expense.financialAccountId || '',
      paymentMethod: expense.paymentMethod,
      paymentMethodDetails: expense.paymentMethodDetails || '',
      documentType: expense.documentType || 'invoice',
      paymentStatus: expense.paymentStatus || 'open',
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
          setImportedData(mappedData);
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
              const value = row[colIndex] ? String(row[colIndex]).trim() : '';
              
              if (header.includes('date')) {
                // Handle various date formats
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
                const amountStr = value.replace(/[€$£,\s]/g, '').replace(',', '.');
                expense.amount = parseFloat(amountStr) || 0;
                if (value.includes('$')) {
                  expense.currency = 'USD';
                } else if (value.includes('£')) {
                  expense.currency = 'GBP';
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
        
        setImportedData(mappedData);
        setShowImportModal(true);
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      alert('Error reading Excel file. Please ensure it\'s a valid .xlsx or .xls file.');
    }
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
      let errorCount = 0;
      
      for (let i = 0; i < importedData.length; i++) {
        const expenseData = importedData[i];
        
        // Skip if missing required fields
        if (!expenseData.date || !expenseData.vendor || !expenseData.amount) {
          errorCount++;
          continue;
        }
        
        try {
          // Map to form data structure
          const parsedAmount = typeof expenseData.amount === 'number'
            ? expenseData.amount
            : parseNumericAmount(expenseData.amount);
          const expenseToAdd = {
            date: expenseData.date,
            invoiceDate: expenseData.invoiceDate || expenseData.date,
            dueDate: expenseData.dueDate || '',
            category: expenseData.category || 'Other',
            currency: expenseData.currency || 'EUR',
            vendor: expenseData.vendor,
            vendorAddress: expenseData.vendorAddress || '',
            vendorCountry: expenseData.vendorCountry || companyCountry,
            invoiceNumber: expenseData.invoiceNumber || '',
            vatNumber: expenseData.vatNumber || '',
            chamberOfCommerceNumber: expenseData.chamberOfCommerceNumber || '',
            description: expenseData.description || expenseData.vendor,
            amount: Number.isFinite(parsedAmount) ? parsedAmount.toFixed(2) : '0',
            btw: typeof expenseData.btw === 'number' ? expenseData.btw : 21,
            reverseCharge: Boolean(expenseData.reverseCharge),
            bankAccount: 'Business Checking',
            financialAccountId: '',
            paymentMethod: expenseData.paymentMethod || 'Debit Card',
            paymentMethodDetails: expenseData.paymentMethodDetails || '',
            documentType: importType === 'ocr' ? 'statement' : (expenseData.documentType || 'invoice'),
            paymentStatus: expenseData.paymentStatus || 'open',
            notes: expenseData.notes || '',
            vatValidationStatus: 'idle',
            vatValidatedAt: '',
            createdAt: new Date().toISOString()
          };
          
          await addCompanyExpense(currentCompanyId, currentUser.uid, expenseToAdd);
          successCount++;
        } catch (error) {
          console.error(`Error importing row ${expenseData.rowIndex}:`, error);
          errorCount++;
        }
        
        // Update progress
        setImportProgress(((i + 1) / importedData.length) * 100);
      }
      
      // Reload expenses
      await loadExpenses();
      
      // Show results
      alert(`Import completed!\nSuccessfully imported: ${successCount}\nErrors: ${errorCount}`);
      
      // Close modal and reset
      setShowImportModal(false);
      setImportedData([]);
      setImportFile(null);
    } catch (error) {
      console.error('Error during bulk import:', error);
      alert('Error during import. Please try again.');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  // Helper function to get date range based on period type
  const getDateRange = (periodType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (periodType) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0]
        };
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0]
        };
      }
      case 'year': {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        return {
          startDate: yearStart.toISOString().split('T')[0],
          endDate: yearEnd.toISOString().split('T')[0]
        };
      }
      default:
        return { startDate: '', endDate: '' };
    }
  };

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
      if (filters.bankAccount !== 'all' && exp.bankAccount !== filters.bankAccount) return false;
      if (filters.paymentMethod !== 'all' && exp.paymentMethod !== filters.paymentMethod) return false;
      if (filters.startDate && exp.date < filters.startDate) return false;
      if (filters.endDate && exp.date > filters.endDate) return false;
      return true;
    });
  }, [expenses, filters]);

  // Calculate totals
  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => {
      const amount = parseFloat(exp.amount) || 0;
      // If amount is encrypted, skip calculation
      if (typeof amount === 'string' && exp.amount_encrypted) return sum;
      return sum + amount;
    }, 0);
  }, [filteredExpenses]);

  const totalVAT = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => {
      const amount = parseFloat(exp.amount) || 0;
      // If amount is encrypted, skip calculation
      if (typeof amount === 'string' && exp.amount_encrypted) return sum;
      const vatRate = parseFloat(exp.btw || 0) / 100;
      return sum + (amount * vatRate);
    }, 0);
  }, [filteredExpenses]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  // Show skeleton UI instead of blocking blank screen
  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Back Button */}
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <FaArrowLeft className="w-5 h-5" />
              </button>
              
              {/* Expense Icon & Title */}
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FaChartLine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
                <p className="text-sm text-gray-500">{currentCompany?.name || 'Company'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CompanySelector />
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      {/* Add/Edit Expense Modal - Available in all views */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddExpense(false);
                    setEditingExpense(null);
                    setSelectedFiles([]);
                    setExistingAttachments([]);
                    setCurrentPreviewId(null);
                    setZoomLevel(DEFAULT_ZOOM);
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      category: 'Subscriptions',
                      vendor: '',
          vendorAddress: '',
                      invoiceNumber: '',
                      vatNumber: '',
                      chamberOfCommerceNumber: '',
                      description: '',
                      amount: '',
                      btw: 21,
                      bankAccount: 'Business Checking',
                      financialAccountId: '',
                      paymentMethod: 'Debit Card',
                      paymentMethodDetails: '',
                      documentType: 'invoice',
                      paymentStatus: 'open',
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)] gap-6 lg:h-[75vh]">
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
                        Defaults to your company’s country. Adjust if this vendor is based elsewhere.
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
                        onAddAccount={() => {
                          window.open('/settings?tab=accounts', '_blank');
                        }}
                      />
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
                    <div>
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
                  </div>
                </div>

                <div className="overflow-y-auto pr-2 lg:max-h-[72vh]">
                  <AttachmentPanel
                    label="Attachments (Optional)"
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

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExpense(false);
                    setEditingExpense(null);
                    setExistingAttachments([]);
                    setSelectedFiles([]);
                    setCurrentPreviewId(null);
                    setZoomLevel(DEFAULT_ZOOM);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <FaSave className="w-4 h-4 inline mr-2" />
                  {editingExpense ? 'Update' : 'Save'} Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

        {/* Filters and Add Button */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          {loading ? (
            // Skeleton for filters
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4 flex-1">
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4">
              {/* Period Filter */}
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* Custom Date Range (shown when custom is selected) */}
              {filters.periodType === 'custom' && (
                <>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Start Date"
                  />
                  <span className="self-center text-gray-500">to</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="End Date"
                  />
                </>
              )}

              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                value={filters.bankAccount}
                onChange={(e) => setFilters({...filters, bankAccount: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Bank Accounts</option>
                {bankAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>

              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Payment Methods</option>
                {paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}
              </select>

              {(filters.category !== 'all' || filters.bankAccount !== 'all' || filters.paymentMethod !== 'all' || filters.periodType !== 'all') && (
                <button
                  onClick={() => setFilters({category: 'all', bankAccount: 'all', paymentMethod: 'all', periodType: 'all', startDate: '', endDate: ''})}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            <button
              onClick={() => {
                if (!currentCompanyId) {
                  alert('Please select a company to add expenses.');
                  return;
                }
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  category: 'Subscriptions',
                  vendor: '',
                  invoiceNumber: '',
                  vatNumber: '',
                  chamberOfCommerceNumber: '',
                  description: '',
                  amount: '',
                  btw: 21,
                  bankAccount: 'Business Checking',
                  financialAccountId: '',
                  paymentMethod: 'Debit Card',
                  paymentMethodDetails: '',
                  documentType: 'invoice',
                  paymentStatus: 'open',
                  notes: ''
                });
                setExistingAttachments([]);
                setSelectedFiles([]);
                setCurrentPreviewId(null);
                setZoomLevel(DEFAULT_ZOOM);
                setEditingExpense(null);
                setShowAddExpense(true);
              }}
              disabled={!currentCompanyId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!currentCompanyId ? 'Please select a company first' : ''}
            >
              <FaPlusCircle />
              Add Expense
            </button>
            
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportType('excel');
                setImportedData([]);
                setImportFile(null);
              }}
              disabled={!currentCompanyId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!currentCompanyId ? 'Please select a company first' : ''}
            >
              <FaFilePdf />
              OCR Bank Statement
            </button>
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Expenses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Category
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Vendor
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Invoice #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      Bank Account
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Payment
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Files
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    // Skeleton rows for loading state
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-3 py-4"><div className="h-6 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-36"></div></td>
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                        <td className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
                      </tr>
                    ))
                  ) : filteredExpenses.length === 0 ? (
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
                                onClick={() => setFilters({category: 'all', bankAccount: 'all', paymentMethod: 'all', periodType: 'all', startDate: '', endDate: ''})}
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
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-[120px] truncate" title={expense.vendor}>
                            {expense.vendor}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="max-w-[120px] truncate" title={expense.invoiceNumber || '-'}>
                            {expense.invoiceNumber || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900">
                          <div className="max-w-xs break-words">
                            {expense.description}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="max-w-[140px] truncate" title={expense.bankAccount || 'N/A'}>
                            {expense.bankAccount || 'N/A'}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                          {expense.paymentMethod}
                          {expense.paymentMethodDetails && (
                            <span className="ml-2 text-xs text-gray-400">
                              ({expense.paymentMethodDetails})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          €{parseFloat(expense.amount).toFixed(2)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
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
                        <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
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
                        </td>
                      </tr>
                    ))
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
                      <FaFilePdf className="text-purple-600" />
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
                        <FaFilePdf className="w-12 h-12 text-purple-400 mx-auto mb-4" />
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
                              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
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
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-purple-900 mb-2">Bank Statement OCR:</p>
                      <ul className="text-xs text-purple-800 space-y-1 list-disc list-inside">
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-900">
                      Found {importedData.length} expenses to import
                    </p>
                    <p className="text-xs text-green-800 mt-1">
                      Review the data below and click "Import All" to add them to your expense tracker.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Date</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Category</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Vendor</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Amount</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedData.slice(0, 20).map((expense, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2">{expense.date || '-'}</td>
                            <td className="px-3 py-2">{expense.category || '-'}</td>
                            <td className="px-3 py-2">{expense.vendor || '-'}</td>
                            <td className="px-3 py-2">{expense.description || '-'}</td>
                            <td className="px-3 py-2 text-right">€{expense.amount || '0.00'}</td>
                            <td className="px-3 py-2">
                              {expense.paymentMethod || '-'}
                              {expense.paymentMethodDetails && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({expense.paymentMethodDetails})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importedData.length > 20 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Showing first 20 of {importedData.length} expenses
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
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
