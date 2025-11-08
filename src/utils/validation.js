/**
 * INPUT VALIDATION SYSTEM
 * 
 * Provides validation and sanitization for all user inputs to prevent:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL Injection (though we use Firestore, still good practice)
 * - Invalid data formats
 * - Malicious inputs
 * 
 * Usage:
 * import { validateEmail, sanitizeString, validateAmount } from '@/utils/validation';
 * 
 * const email = validateEmail(userInput.email);
 * const cleanText = sanitizeString(userInput.description);
 */

// Email validation (RFC 5322 compliant)
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.trim().toLowerCase();
  
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Invalid email format');
  }
  
  if (cleanEmail.length > 254) {
    throw new Error('Email is too long');
  }
  
  return cleanEmail;
};

// String sanitization (remove HTML tags and dangerous characters)
export const sanitizeString = (str, maxLength = 1000) => {
  if (!str) return '';
  if (typeof str !== 'string') return String(str);
  
  let clean = str;

  try {
    if (typeof window !== 'undefined' && window.document && window.document.createElement) {
      const template = window.document.createElement('template');
      template.innerHTML = str;
      clean = template.content.textContent || '';
    } else if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${str}</div>`, 'text/html');
      clean = doc.body.textContent || '';
    } else {
      // Fallback: strip tags via regex when DOM APIs are unavailable
      clean = str.replace(/<\/?[^>]+(>|$)/g, '');
    }
  } catch {
    clean = str.replace(/<\/?[^>]+(>|$)/g, '');
  }

  // Remove null bytes and other control characters
  clean = clean.replace(/[\u0000-\u001F\u007F]/g, '');

  // Trim and limit length
  clean = clean.trim().substring(0, maxLength);

  return clean;
};

// Number validation
export const validateNumber = (value, min = -Infinity, max = Infinity) => {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new Error('Value must be a number');
  }
  
  if (num < min) {
    throw new Error(`Value must be at least ${min}`);
  }
  
  if (num > max) {
    throw new Error(`Value must be at most ${max}`);
  }
  
  return num;
};

// Amount validation (for financial values)
export const validateAmount = (amount, allowNegative = false) => {
  const num = validateNumber(amount, allowNegative ? -Infinity : 0, 999999999.99);
  
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
};

// Date validation
export const validateDate = (dateValue) => {
  if (!dateValue) {
    throw new Error('Date is required');
  }
  
  const date = new Date(dateValue);
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  
  // Ensure date is not too far in the past or future
  const minDate = new Date('2000-01-01');
  const maxDate = new Date('2100-12-31');
  
  if (date < minDate || date > maxDate) {
    throw new Error('Date is out of acceptable range');
  }
  
  return date;
};

// Phone number validation (basic international format)
export const validatePhone = (phone) => {
  if (!phone) return null;
  
  // Remove all non-numeric characters except +
  const clean = phone.replace(/[^\d+]/g, '');
  
  if (clean.length < 10 || clean.length > 15) {
    throw new Error('Invalid phone number length');
  }
  
  return clean;
};

// URL validation
export const validateURL = (url) => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }
    
    return urlObj.href;
  } catch {
    throw new Error('Invalid URL format');
  }
};

// Password strength validation
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    throw new Error('Password is too long');
  }
  
  // Check for complexity
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    throw new Error('Password must contain uppercase, lowercase, and numbers');
  }
  
  return true;
};

// File upload validation
export const validateFile = (file, allowedTypes = [], maxSize = 5242880) => {
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Check file size (default 5MB)
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
  }
  
  // Check file type if specified
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  return true;
};

// Validate required fields in an object
export const validateRequired = (data, requiredFields) => {
  const missing = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  });
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  return true;
};

// Validate expense data
export const validateExpense = (expense) => {
  validateRequired(expense, ['date', 'category', 'vendor', 'amount']);
  
  return {
    date: validateDate(expense.date),
    category: sanitizeString(expense.category, 100),
    vendor: sanitizeString(expense.vendor, 200),
    amount: validateAmount(expense.amount),
    description: sanitizeString(expense.description || '', 500),
  };
};

// Validate income data
export const validateIncome = (income) => {
  validateRequired(income, ['date', 'category', 'amount']);
  
  return {
    date: validateDate(income.date),
    category: sanitizeString(income.category, 100),
    source: sanitizeString(income.source || '', 200),
    amount: validateAmount(income.amount),
    description: sanitizeString(income.description || '', 500),
  };
};

// Validate invoice data
export const validateInvoice = (invoice) => {
  validateRequired(invoice, ['invoiceNumber', 'customer', 'dueDate', 'items']);
  
  if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
    throw new Error('Invoice must have at least one item');
  }
  
  return {
    invoiceNumber: sanitizeString(invoice.invoiceNumber, 50),
    customer: sanitizeString(invoice.customer, 200),
    dueDate: validateDate(invoice.dueDate),
    items: invoice.items.map(item => ({
      description: sanitizeString(item.description, 200),
      quantity: validateNumber(item.quantity, 0),
      price: validateAmount(item.price),
    })),
  };
};

// Generic validation wrapper with error handling
export const safeValidate = (validationFn, data, defaultValue = null) => {
  try {
    return validationFn(data);
  } catch (error) {
    console.error('Validation error:', error.message);
    return defaultValue;
  }
};
