/**
 * INVOICE TEMPLATE CONFIGURATION
 * 
 * Default invoice/receipt template settings and customization options
 */

export const DEFAULT_INVOICE_TEMPLATE = {
  // Layout
  backgroundColor: '#FFFFFF', // White background
  headerStyle: 'minimal', // 'minimal' | 'colored' | 'none'
  headerColor: null, // null for white, or hex color
  headerHeight: 0, // 0 for no header bar
  
  // Colors
  useColor: true, // Enable/disable color
  primaryColor: null, // Company primary color (null = use branding)
  textColor: '#111827', // Main text color (dark gray)
  secondaryTextColor: '#6B7280', // Secondary text (medium gray)
  accentColor: '#4F46E5', // Accent color for highlights
  
  // Typography
  companyNameFontSize: 18,
  companyNameFontWeight: 'bold',
  invoiceNumberFontSize: 16,
  invoiceNumberFontWeight: 'semibold',
  
  // Logo
  showLogo: true,
  logoSize: 40, // pixels
  logoPosition: 'left', // 'left' | 'center' | 'right'
  
  // Sections
  showCompanyDetails: true,
  showCustomerDetails: true,
  showDates: true,
  showLineItems: true,
  showTotals: true,
  showPaymentInfo: true,
  showNotes: true,
  showFooter: true,
  
  // Styling
  sectionSpacing: 24, // pixels between sections
  borderColor: '#E5E7EB', // Light gray borders
  tableHeaderBg: '#F9FAFB', // Light gray for table headers
  customerBoxBg: '#F9FAFB', // Light gray for customer info box
  paymentBoxBg: '#F0FDF4', // Light green for payment info (paid)
  paymentBoxBorder: '#BBF7D0', // Green border
  
  // Black & White Mode
  blackAndWhite: false, // When true, all colors become grayscale
  
  // PDF Specific
  pdfPageSize: 'A4', // 'A4' | 'Letter'
  pdfMargin: 20, // pixels
  pdfFontFamily: 'helvetica', // 'helvetica' | 'times' | 'courier'
};

/**
 * Get invoice template with company customizations
 * @param {Object} company - Company object with branding
 * @returns {Object} Template configuration
 */
export const getInvoiceTemplate = (company) => {
  const defaultTemplate = { ...DEFAULT_INVOICE_TEMPLATE };
  
  // Get company branding
  const branding = company?.branding || {};
  const invoiceTemplate = branding.invoiceTemplate || {};
  
  // Merge with defaults
  const template = {
    ...defaultTemplate,
    ...invoiceTemplate,
    // Use company primary color if not overridden
    primaryColor: invoiceTemplate.primaryColor || branding.primaryColor || defaultTemplate.accentColor,
  };
  
  // Apply black & white mode if enabled
  if (template.blackAndWhite) {
    return applyBlackAndWhiteMode(template);
  }
  
  return template;
};

/**
 * Apply black and white mode to template
 * @param {Object} template - Template configuration
 * @returns {Object} Black & white template
 */
export const applyBlackAndWhiteMode = (template) => {
  return {
    ...template,
    useColor: false,
    headerColor: null,
    primaryColor: '#000000',
    accentColor: '#000000',
    borderColor: '#CCCCCC',
    tableHeaderBg: '#F5F5F5',
    customerBoxBg: '#F5F5F5',
    paymentBoxBg: '#F5F5F5',
    paymentBoxBorder: '#CCCCCC',
    textColor: '#000000',
    secondaryTextColor: '#666666',
  };
};

/**
 * Get RGB color from template color setting
 * @param {string} colorHex - Hex color or null
 * @param {string} defaultColor - Default hex color
 * @returns {Array} [R, G, B] array
 */
export const getTemplateColorRGB = (colorHex, defaultColor = '#000000') => {
  if (!colorHex) return hexToRgb(defaultColor);
  return hexToRgb(colorHex);
};

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Array} [R, G, B] array
 */
const hexToRgb = (hex) => {
  if (!hex) return [0, 0, 0];
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

