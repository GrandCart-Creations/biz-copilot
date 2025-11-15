/**
 * REPORT GENERATOR
 * 
 * Generates PDF reports for financial statements
 */

import jsPDF from 'jspdf';

export const generateReportPDF = (reportData, reportType) => {
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

  // Company header
  const companyName = reportData.company?.name || 'Company';
  addText(companyName, margin, yPos, {
    fontSize: 18,
    fontStyle: 'bold'
  });
  yPos += 10;

  // Report title
  let reportTitle = '';
  if (reportType === 'profitLoss') {
    reportTitle = 'Profit & Loss Statement';
  } else if (reportType === 'cashFlow') {
    reportTitle = 'Cash Flow Statement';
  } else if (reportType === 'expenseAnalytics') {
    reportTitle = 'Expense Analytics Report';
  } else if (reportType === 'incomeAnalytics') {
    reportTitle = 'Income Analytics Report';
  }

  addText(reportTitle, margin, yPos, {
    fontSize: 16,
    fontStyle: 'bold'
  });
  yPos += 8;

  // Period
  addText(`Period: ${reportData.period || 'N/A'}`, margin, yPos, {
    fontSize: 10,
    color: [100, 100, 100]
  });
  yPos += 15;

  // Report content based on type
  if (reportType === 'profitLoss' && reportData.profitLoss) {
    const pl = reportData.profitLoss;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
    addText('Item', margin + 2, yPos, { fontSize: 10, fontStyle: 'bold' });
    addText('Amount', pageWidth - margin - 2, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
    yPos += 8;

    // Table rows
    const rows = [
      ['Revenue', pl.totalRevenue],
      ['Less: Revenue VAT', -pl.revenueVAT],
      ['Net Revenue', pl.netRevenue],
      ['Expenses', pl.totalExpenses],
      ['Less: Expense VAT', -pl.expenseVAT],
      ['Net Expenses', pl.netExpenses],
      ['Gross Profit', pl.grossProfit],
      ['Net VAT Payable', pl.netVAT],
      ['Net Profit / Loss', pl.netProfit]
    ];

    rows.forEach(([label, value]) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin + 20;
      }

      const isTotal = label.includes('Net Profit') || label.includes('Net Revenue') || label.includes('Net Expenses');
      
      addText(label, margin + 2, yPos, {
        fontSize: isTotal ? 11 : 10,
        fontStyle: isTotal ? 'bold' : 'normal'
      });
      
      const formattedValue = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR'
      }).format(value);
      
      addText(formattedValue, pageWidth - margin - 2, yPos, {
        fontSize: isTotal ? 11 : 10,
        fontStyle: isTotal ? 'bold' : 'normal',
        align: 'right',
        color: label.includes('Net Profit') && value < 0 ? [239, 68, 68] : [0, 0, 0]
      });

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos + 3, pageWidth - margin, yPos + 3);
      yPos += 8;
    });
  } else if (reportType === 'cashFlow' && reportData.cashFlow) {
    const cf = reportData.cashFlow;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
    addText('Item', margin + 2, yPos, { fontSize: 10, fontStyle: 'bold' });
    addText('Amount', pageWidth - margin - 2, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
    yPos += 8;

    const rows = [
      ['Operating Income (Paid)', cf.operatingIncome],
      ['Operating Expenses (Paid)', -cf.operatingExpenses],
      ['Operating Cash Flow', cf.operatingCashFlow],
      ['Accounts Receivable', cf.accountsReceivable],
      ['Accounts Payable', -cf.accountsPayable],
      ['Net Cash Flow', cf.netCashFlow]
    ];

    rows.forEach(([label, value]) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin + 20;
      }

      const isTotal = label.includes('Net Cash Flow') || label.includes('Operating Cash Flow');
      
      addText(label, margin + 2, yPos, {
        fontSize: isTotal ? 11 : 10,
        fontStyle: isTotal ? 'bold' : 'normal'
      });
      
      const formattedValue = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR'
      }).format(Math.abs(value));
      
      addText(formattedValue, pageWidth - margin - 2, yPos, {
        fontSize: isTotal ? 11 : 10,
        fontStyle: isTotal ? 'bold' : 'normal',
        align: 'right',
        color: label.includes('Net Cash Flow') && value < 0 ? [239, 68, 68] : [0, 0, 0]
      });

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos + 3, pageWidth - margin, yPos + 3);
      yPos += 8;
    });
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated by Biz-CoPilot • ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Download
  const filename = `Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

