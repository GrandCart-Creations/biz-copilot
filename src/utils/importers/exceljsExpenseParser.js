import ExcelJS from 'exceljs';

const HEADER_KEYWORDS = ['date', 'category', 'vendor', 'description', 'amount', 'payment'];

const normaliseHeader = (header = '') => String(header || '').toLowerCase().trim();

const guessDocumentType = (worksheet) => {
  const text = worksheet.getSheetValues()
    .flat()
    .map((cell) => String(cell || '').toLowerCase())
    .join(' ');

  if (text.includes('statement')) return 'statement';
  if (text.includes('receipt')) return 'receipt';
  return 'invoice';
};

export const parseExpensesWithExcelJS = async (file) => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file.');
  }

  const rawSheetValues = worksheet.getSheetValues();
  const sheetValues = [];

  rawSheetValues.forEach((rowValues, index) => {
    const values = Array.isArray(rowValues) ? rowValues.slice(1) : [];
    sheetValues.push({
      rowNumber: index,
      values,
    });
  });

  const headerCandidate = sheetValues.find((entry) => {
    if (!entry || !Array.isArray(entry.values)) {
      return false;
    }
    const joined = entry.values.map((value) => String(value || '').toLowerCase()).join(' ');
    return HEADER_KEYWORDS.some((keyword) => joined.includes(keyword));
  });

  if (!headerCandidate) {
    throw new Error('Could not find a header row in the Excel file.');
  }

  const headerRowIndex = headerCandidate.rowNumber;
  const headers = headerCandidate.values.map(normaliseHeader);

  const rows = sheetValues
    .filter(({ rowNumber }) => rowNumber > headerRowIndex)
    .map(({ values, rowNumber }) => ({
      rowIndex: rowNumber + 1,
      values,
    }))
    .filter(({ values }) => values.some((value) => value !== null && value !== ''));

  const mappedData = rows.map(({ rowIndex, values }) => {
    const expense = {
      rowIndex,
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
      vatNumber: '',
      btw: 21,
      reverseCharge: false,
      documentType: guessDocumentType(worksheet),
    };

    headers.forEach((header, index) => {
      const value = values[index] ? String(values[index]).trim() : '';

      if (header.includes('date')) {
        const excelDate = values[index];
        const assignDateValue = (targetKey) => {
          if (excelDate instanceof Date) {
            expense[targetKey] = excelDate.toISOString().split('T')[0];
          } else if (value) {
            const parsedDate = new Date(value);
            if (!Number.isNaN(parsedDate.getTime())) {
              expense[targetKey] = parsedDate.toISOString().split('T')[0];
            }
          }
        };

        if (header.includes('invoice')) {
          assignDateValue('invoiceDate');
        } else if (header.includes('due')) {
          assignDateValue('dueDate');
        } else {
          assignDateValue('date');
        }
      } else if (header.includes('category')) {
        expense.category = value || 'Other';
      } else if (header.includes('vendor') || header.includes('supplier') || header.includes('service')) {
        expense.vendor = value;
      } else if (header.includes('address')) {
        expense.vendorAddress = value;
      } else if (header.includes('country')) {
        expense.vendorCountry = value.slice(0, 2).toUpperCase();
      } else if (header.includes('description')) {
        expense.description = value;
      } else if (header.includes('amount') && !header.includes('vat')) {
        const amountStr = value.replace(/[€$£,\s]/g, '').replace(',', '.');
        expense.amount = parseFloat(amountStr) || 0;
        if (value.includes('$')) {
          expense.currency = 'USD';
        } else if (value.includes('£')) {
          expense.currency = 'GBP';
        } else if (value.includes('€')) {
          expense.currency = 'EUR';
        }
      } else if (header.includes('currency')) {
        expense.currency = value.toUpperCase();
      } else if ((header.includes('vat') || header.includes('btw')) && header.includes('rate')) {
        const numericRate = parseInt(value, 10);
        if (!Number.isNaN(numericRate)) {
          expense.btw = numericRate;
        }
      } else if (header.includes('vat') && !header.includes('rate')) {
        expense.vatNumber = value.toUpperCase().replace(/\s+/g, '');
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
      } else if (header.includes('reverse') && header.includes('charge')) {
        const lowerValue = value.toLowerCase();
        expense.reverseCharge = lowerValue.includes('true') || lowerValue.includes('yes');
      }
    });

    if (!expense.date && expense.invoiceDate) {
      expense.date = expense.invoiceDate;
    }

    return expense;
  });

  return mappedData.filter((expense) => expense.vendor || expense.description || expense.amount > 0);
};

export default parseExpensesWithExcelJS;

