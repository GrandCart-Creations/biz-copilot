/**
 * PDF GENERATOR UTILITY
 * 
 * Generates professional PDF invoices and quotes using jsPDF
 */

import jsPDF from 'jspdf';

/**
 * Convert image URL to base64 (for jsPDF)
 * @param {string} url - Image URL
 * @returns {Promise<{data: string, format: string}>} Base64 data URL and format
 */
const imageUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const format = blob.type.includes('png') ? 'PNG' : 
                   blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : 
                   'PNG'; // Default to PNG
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ data: reader.result, format });
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Error converting image to base64:', error);
    return null;
  }
};

/**
 * Generate PDF for invoice or quote
 * @param {Object} document - Invoice or quote document
 * @param {Object} company - Company information (full company object with branding)
 * @param {string} type - 'invoice' or 'quote'
 * @returns {Promise<jsPDF>} PDF document
 */
export const generateInvoicePDF = async (document, company, type = 'invoice') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper function to add text with word wrap
  const addText = (text, x, y, options = {}) => {
    const {
      fontSize = 10,
      fontStyle = 'normal',
      color = [0, 0, 0],
      maxWidth = contentWidth,
      align = 'left'
    } = options;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(...color);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y, { align });
    return y + (lines.length * fontSize * 0.4);
  };

  // Helper to convert hex color to RGB
  const hexToRgb = (hex) => {
    if (!hex) return [79, 70, 229]; // Default indigo
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [79, 70, 229];
  };

  // Get company branding
  const branding = company?.branding || {};
  const primaryColor = hexToRgb(branding.primaryColor || company?.primaryColor || '#4F46E5');
  const companyName = company?.name || 'Biz-CoPilot';
  const companyAddress = company?.address || '';
  const companyCity = company?.city || '';
  const companyPostalCode = company?.postalCode || '';
  const companyCountry = company?.country || '';
  const companyPhone = company?.phone || company?.contactPhone || '';
  const companyEmail = company?.email || company?.contactEmail || '';
  const companyWebsite = company?.website || '';

  // Header with company color (reduced height to 30px)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Add logo if available
  let logoX = margin;
  let logoWidth = 0;
  let logoHeight = 0;
  
  if (branding.logoUrl) {
    try {
      // Convert logo URL to base64 and add to PDF
      const logoData = await imageUrlToBase64(branding.logoUrl);
      if (logoData && logoData.data) {
        const logoSize = 18;
        logoWidth = logoSize;
        logoHeight = logoSize;
        
        // Add logo image to PDF
        doc.addImage(logoData.data, logoData.format, logoX, 6, logoWidth, logoHeight);
        
        // Adjust text position to account for logo
        logoX += logoWidth + 8;
      }
    } catch (e) {
      console.warn('Could not load logo:', e);
    }
  }
  
  addText(companyName, logoX, 20, {
    fontSize: 16,
    fontStyle: 'bold',
    color: [255, 255, 255]
  });

  // Document type and number
  yPos = margin + 30;
  addText(type === 'invoice' ? 'INVOICE' : 'QUOTE', pageWidth - margin, yPos, {
    fontSize: 24,
    fontStyle: 'bold',
    align: 'right'
  });
  
  yPos += 8;
  addText(
    type === 'invoice' 
      ? `Invoice #${document.invoiceNumber || 'N/A'}` 
      : `Quote #${document.quoteNumber || 'N/A'}`,
    pageWidth - margin,
    yPos,
    {
      fontSize: 12,
      align: 'right',
      color: [100, 100, 100]
    }
  );

  // Company info (left side) - Full contact details
  yPos = margin + 40;
  const companyInfo = [
    companyName,
    companyAddress,
    [companyCity, companyPostalCode].filter(Boolean).join(' '),
    companyCountry,
    companyPhone ? `Phone: ${companyPhone}` : '',
    companyEmail ? `Email: ${companyEmail}` : '',
    companyWebsite ? `Website: ${companyWebsite}` : ''
  ].filter(Boolean);
  
  companyInfo.forEach((line, index) => {
    yPos = addText(line, margin, yPos + (index === 0 ? 0 : 4), {
      fontSize: index === 0 ? 12 : 9,
      fontStyle: index === 0 ? 'bold' : 'normal',
      color: index === 0 ? [0, 0, 0] : [60, 60, 60]
    });
  });

  // Customer info (right side)
  yPos = margin + 40;
  const customerInfo = [
    'Bill To:',
    document.customerName || '',
    document.customerAddress || ''
  ].filter(Boolean);
  
  customerInfo.forEach((line, index) => {
    yPos = addText(line, pageWidth / 2, yPos + (index === 0 ? 0 : 5), {
      fontSize: index === 0 ? 12 : 10,
      fontStyle: index === 0 ? 'bold' : 'normal',
      align: 'left'
    });
  });

  // Dates
  yPos += 15;
  const docDate = document.invoiceDate?.toDate?.() || new Date(document.invoiceDate);
  const dueDate = document.dueDate?.toDate?.() || (document.dueDate ? new Date(document.dueDate) : null);
  const expiryDate = document.expiryDate?.toDate?.() || (document.expiryDate ? new Date(document.expiryDate) : null);

  addText(
    type === 'invoice' ? `Invoice Date: ${docDate.toLocaleDateString()}` : `Quote Date: ${docDate.toLocaleDateString()}`,
    margin,
    yPos,
    { fontSize: 10 }
  );

  if (dueDate) {
    addText(
      `Due Date: ${dueDate.toLocaleDateString()}`,
      margin,
      yPos + 5,
      { fontSize: 10 }
    );
  } else if (expiryDate && type === 'quote') {
    addText(
      `Valid Until: ${expiryDate.toLocaleDateString()}`,
      margin,
      yPos + 5,
      { fontSize: 10 }
    );
  }

  // Line items table
  yPos += 20;
  const tableTop = yPos;
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
  
  addText('Description', margin + 2, yPos, { fontSize: 10, fontStyle: 'bold' });
  addText('Qty', margin + 100, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  addText('Price', margin + 130, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  addText('Amount', pageWidth - margin - 2, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  
  yPos += 8;

  // Line items
  const lineItems = document.lineItems || [];
  lineItems.forEach((item, index) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin + 20;
    }

    addText(item.description || '', margin + 2, yPos, { fontSize: 10, maxWidth: 90 });
    addText(
      (item.quantity || 0).toString(),
      margin + 100,
      yPos,
      { fontSize: 10, align: 'right' }
    );
    addText(
      `€${(item.unitPrice || 0).toFixed(2)}`,
      margin + 130,
      yPos,
      { fontSize: 10, align: 'right' }
    );
    addText(
      `€${(item.amount || 0).toFixed(2)}`,
      pageWidth - margin - 2,
      yPos,
      { fontSize: 10, align: 'right' }
    );

    // Draw line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos + 3, pageWidth - margin, yPos + 3);
    
    yPos += 8;
  });

  // Totals
  yPos += 10;
  const subtotal = parseFloat(document.subtotal || 0);
  const taxRate = parseFloat(document.taxRate || 0);
  const taxAmount = parseFloat(document.taxAmount || 0);
  const total = parseFloat(document.total || 0);

  addText('Subtotal:', pageWidth - margin - 60, yPos, {
    fontSize: 10,
    align: 'right'
  });
  addText(`€${subtotal.toFixed(2)}`, pageWidth - margin - 2, yPos, {
    fontSize: 10,
    align: 'right'
  });

  if (taxRate > 0) {
    yPos += 6;
    addText(`VAT (${taxRate}%):`, pageWidth - margin - 60, yPos, {
      fontSize: 10,
      align: 'right'
    });
    addText(`€${taxAmount.toFixed(2)}`, pageWidth - margin - 2, yPos, {
      fontSize: 10,
      align: 'right'
    });
  }

  // Total line immediately after VAT (no extra spacing)
  yPos += 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 80, yPos - 2, pageWidth - margin, yPos - 2);
  
  addText('Total:', pageWidth - margin - 80, yPos, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'right'
  });
  addText(`€${total.toFixed(2)}`, pageWidth - margin - 2, yPos, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'right'
  });

  // Payment Link (for invoices)
  if (type === 'invoice' && document.status !== 'paid') {
    yPos += 15;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin + 20;
    }
    
    // Payment section with colored background - properly aligned
    const paymentBoxHeight = 18;
    const paymentBoxY = yPos - 5;
    doc.setFillColor(...primaryColor);
    doc.setDrawColor(...primaryColor);
    doc.roundedRect(margin, paymentBoxY, contentWidth, paymentBoxHeight, 3, 3, 'FD');
    
    addText('Payment Information', margin + 8, paymentBoxY + 6, {
      fontSize: 11,
      fontStyle: 'bold',
      color: [255, 255, 255]
    });
    
    const paymentUrl = document.paymentLink || `${companyWebsite || 'https://biz-copilot.com'}/pay/${document.id || document.invoiceNumber}`;
    addText(`Pay online: ${paymentUrl}`, margin + 8, paymentBoxY + 12, {
      fontSize: 9,
      color: [255, 255, 255],
      maxWidth: contentWidth - 16
    });
    
    yPos += paymentBoxHeight + 5;
  }

  // Notes and terms
  if (document.notes || document.terms) {
    yPos += 20;
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin + 20;
    }

    if (document.notes) {
      addText('Notes:', margin, yPos, {
        fontSize: 10,
        fontStyle: 'bold'
      });
      yPos = addText(document.notes, margin, yPos + 5, {
        fontSize: 10,
        maxWidth: contentWidth
      });
    }

    if (document.terms) {
      yPos += 5;
      addText('Terms & Conditions:', margin, yPos, {
        fontSize: 10,
        fontStyle: 'bold'
      });
      yPos = addText(document.terms, margin, yPos + 5, {
        fontSize: 10,
        maxWidth: contentWidth
      });
    }
  }

  // Contact Information Footer
  yPos += 15;
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin + 20;
  }
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  const contactInfo = [
    'Questions or billing issues?',
    companyEmail ? `Email: ${companyEmail}` : '',
    companyPhone ? `Phone: ${companyPhone}` : ''
  ].filter(Boolean);
  
  contactInfo.forEach((line, index) => {
    yPos = addText(line, margin, yPos + (index === 0 ? 0 : 4), {
      fontSize: index === 0 ? 10 : 9,
      fontStyle: index === 0 ? 'bold' : 'normal',
      color: [80, 80, 80]
    });
  });

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${companyName} • Generated by Biz-CoPilot • ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  return doc;
};

/**
 * Generate Receipt PDF for paid invoice
 * @param {Object} invoice - Invoice document
 * @param {Object} company - Company information
 * @param {Object} paymentDetails - Payment details (method, reference, etc.)
 * @returns {Promise<jsPDF>} PDF document
 */
export const generateReceiptPDF = async (invoice, company, paymentDetails = {}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper function to add text with word wrap
  const addText = (text, x, y, options = {}) => {
    const {
      fontSize = 10,
      fontStyle = 'normal',
      color = [0, 0, 0],
      maxWidth = contentWidth,
      align = 'left'
    } = options;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(...color);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y, { align });
    return y + (lines.length * fontSize * 0.4);
  };

  // Helper to convert hex color to RGB
  const hexToRgb = (hex) => {
    if (!hex) return [79, 70, 229];
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [79, 70, 229];
  };

  // Get company branding
  const branding = company?.branding || {};
  const primaryColor = hexToRgb(branding.primaryColor || company?.primaryColor || '#4F46E5');
  const companyName = company?.name || 'Biz-CoPilot';
  
  // Generate receipt number
  const receiptNumber = `REC-${invoice.invoiceNumber || invoice.id || 'N/A'}`;
  const paidDate = invoice.paidDate?.toDate?.() || new Date(invoice.paidDate || new Date());

  // Header with company color (30px)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Add logo if available
  let logoX = margin;
  if (branding.logoUrl) {
    try {
      const logoData = await imageUrlToBase64(branding.logoUrl);
      if (logoData && logoData.data) {
        const logoSize = 18;
        doc.addImage(logoData.data, logoData.format, logoX, 6, logoSize, logoSize);
        logoX += logoSize + 8;
      }
    } catch (e) {
      console.warn('Could not load logo:', e);
    }
  }
  
  addText(companyName, logoX, 20, {
    fontSize: 16,
    fontStyle: 'bold',
    color: [255, 255, 255]
  });

  // Receipt title and number
  yPos = margin + 30;
  addText('RECEIPT', pageWidth - margin, yPos, {
    fontSize: 24,
    fontStyle: 'bold',
    align: 'right'
  });
  
  yPos += 8;
  addText(`Receipt #${receiptNumber}`, pageWidth - margin, yPos, {
    fontSize: 12,
    align: 'right',
    color: [100, 100, 100]
  });

  // Company info (left side)
  yPos = margin + 40;
  addText(companyName, margin, yPos, {
    fontSize: 12,
    fontStyle: 'bold'
  });

  // Customer info (right side)
  yPos = margin + 40;
  const customerInfo = [
    'Paid By:',
    invoice.customerName || '',
    invoice.customerAddress || ''
  ].filter(Boolean);
  
  customerInfo.forEach((line, index) => {
    yPos = addText(line, pageWidth / 2, yPos + (index === 0 ? 0 : 5), {
      fontSize: index === 0 ? 12 : 10,
      fontStyle: index === 0 ? 'bold' : 'normal',
      align: 'left'
    });
  });

  // Payment date
  yPos += 10;
  addText(`Payment Date: ${paidDate.toLocaleDateString()}`, margin, yPos, {
    fontSize: 10
  });

  // Invoice reference
  addText(`For Invoice: ${invoice.invoiceNumber || 'N/A'}`, pageWidth - margin, yPos, {
    fontSize: 10,
    align: 'right'
  });

  // Line items table
  yPos += 20;
  const tableTop = yPos;
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
  
  addText('Description', margin + 2, yPos, { fontSize: 10, fontStyle: 'bold' });
  addText('Qty', margin + 100, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  addText('Amount', pageWidth - margin - 2, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  
  yPos += 8;

  // Line items
  const lineItems = invoice.lineItems || [];
  lineItems.forEach((item) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin + 20;
    }

    addText(item.description || '', margin + 2, yPos, { fontSize: 10, maxWidth: 90 });
    addText((item.quantity || 0).toString(), margin + 100, yPos, { fontSize: 10, align: 'right' });
    addText(`€${(item.amount || 0).toFixed(2)}`, pageWidth - margin - 2, yPos, { fontSize: 10, align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos + 3, pageWidth - margin, yPos + 3);
    
    yPos += 8;
  });

  // Totals
  yPos += 10;
  const subtotal = parseFloat(invoice.subtotal || 0);
  const taxAmount = parseFloat(invoice.taxAmount || 0);
  const total = parseFloat(invoice.total || 0);

  addText('Subtotal:', pageWidth - margin - 60, yPos, {
    fontSize: 10,
    align: 'right'
  });
  addText(`€${subtotal.toFixed(2)}`, pageWidth - margin - 2, yPos, {
    fontSize: 10,
    align: 'right'
  });

  if (invoice.taxRate > 0) {
    yPos += 6;
    addText(`VAT (${invoice.taxRate}%):`, pageWidth - margin - 60, yPos, {
      fontSize: 10,
      align: 'right'
    });
    addText(`€${taxAmount.toFixed(2)}`, pageWidth - margin - 2, yPos, {
      fontSize: 10,
      align: 'right'
    });
  }

  // Total line immediately after VAT
  yPos += 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 80, yPos - 2, pageWidth - margin, yPos - 2);
  
  addText('Total Paid:', pageWidth - margin - 80, yPos, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'right'
  });
  addText(`€${total.toFixed(2)}`, pageWidth - margin - 2, yPos, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'right'
  });

  // Payment Information
  yPos += 20;
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin + 20;
  }
  
  doc.setFillColor(...primaryColor);
  doc.setDrawColor(...primaryColor);
  const paymentBoxHeight = 25;
  const paymentBoxY = yPos - 5;
  doc.roundedRect(margin, paymentBoxY, contentWidth, paymentBoxHeight, 3, 3, 'FD');
  
  addText('Payment Confirmation', margin + 8, paymentBoxY + 6, {
    fontSize: 11,
    fontStyle: 'bold',
    color: [255, 255, 255]
  });
  
  yPos = paymentBoxY + 12;
  if (paymentDetails.paymentMethod) {
    addText(`Payment Method: ${paymentDetails.paymentMethod}`, margin + 8, yPos, {
      fontSize: 9,
      color: [255, 255, 255]
    });
    yPos += 5;
  }
  
  if (paymentDetails.paymentReference) {
    addText(`Reference: ${paymentDetails.paymentReference}`, margin + 8, yPos, {
      fontSize: 9,
      color: [255, 255, 255]
    });
    yPos += 5;
  }
  
  addText(`Paid on: ${paidDate.toLocaleDateString()}`, margin + 8, yPos, {
    fontSize: 9,
    color: [255, 255, 255]
  });

  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${companyName} • Receipt for Invoice ${invoice.invoiceNumber || 'N/A'} • ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  return doc;
};

/**
 * Download PDF
 * @param {jsPDF} pdfDoc - PDF document
 * @param {string} filename - Filename for download
 */
export const downloadPDF = (pdfDoc, filename) => {
  pdfDoc.save(filename);
};

/**
 * Get PDF as blob for email attachment
 * @param {jsPDF} pdfDoc - PDF document
 * @returns {Promise<Blob>} PDF blob
 */
export const getPDFBlob = (pdfDoc) => {
  return new Promise((resolve) => {
    const blob = pdfDoc.output('blob');
    resolve(blob);
  });
};

