/**
 * PDF GENERATOR UTILITY
 * 
 * Generates professional PDF invoices and quotes using jsPDF
 */

import jsPDF from 'jspdf';

/**
 * Generate PDF for invoice or quote
 * @param {Object} document - Invoice or quote document
 * @param {Object} company - Company information (full company object with branding)
 * @param {string} type - 'invoice' or 'quote'
 * @returns {jsPDF} PDF document
 */
export const generateInvoicePDF = (document, company, type = 'invoice') => {
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

  // Header with company color
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Add logo if available (as text placeholder - actual image would require additional setup)
  if (branding.logoUrl) {
    // Note: To add actual logo image, you'd need to load it as base64 or URL
    // For now, we'll just use the company name
  }
  
  addText(companyName, margin, 30, {
    fontSize: 22,
    fontStyle: 'bold',
    color: [255, 255, 255]
  });

  // Document type and number
  yPos = margin + 50;
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
  yPos = margin + 60;
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
  yPos = margin + 50;
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

  yPos += 8;
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
    yPos += 20;
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin + 20;
    }
    
    // Payment section with colored background
    doc.setFillColor(...primaryColor.map(c => Math.min(255, c + 20))); // Lighter shade
    doc.setDrawColor(...primaryColor);
    doc.roundedRect(margin, yPos - 8, contentWidth, 15, 3, 3, 'FD');
    
    addText('Payment Information', margin + 5, yPos + 2, {
      fontSize: 11,
      fontStyle: 'bold',
      color: [0, 0, 0]
    });
    
    yPos += 8;
    const paymentUrl = document.paymentLink || `${companyWebsite || 'https://biz-copilot.com'}/pay/${document.id || document.invoiceNumber}`;
    addText(`Pay online: ${paymentUrl}`, margin + 5, yPos, {
      fontSize: 9,
      color: [0, 0, 255],
      maxWidth: contentWidth - 10
    });
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

