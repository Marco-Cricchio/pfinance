/**
 * Shared parsing utilities for financial documents (Excel and PDF)
 * Handles Italian locale formats for dates, amounts, and descriptions
 */

/**
 * Formats an Italian date string to ISO format (YYYY-MM-DD)
 * Supports multiple input formats: DD/MM/YYYY, DD-MM-YYYY, Excel serial numbers
 */
export function formatItalianDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Remove extra spaces
  const cleanDateStr = dateStr.trim();
  
  // If it's an Excel serial number, convert to date
  if (!isNaN(Number(cleanDateStr)) && Number(cleanDateStr) > 1000) {
    const excelDate = new Date((Number(cleanDateStr) - 25569) * 86400 * 1000);
    return excelDate.toISOString().split('T')[0];
  }
  
  // Italian format: DD/MM/YYYY or DD/MM/YY
  const italianDateMatch = cleanDateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (italianDateMatch) {
    let [, day, month, year] = italianDateMatch;
    
    // Handle 2-digit years
    if (year.length === 2) {
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      const twoDigitYear = parseInt(year);
      year = String(twoDigitYear > 50 ? currentCentury - 100 + twoDigitYear : currentCentury + twoDigitYear);
    }
    
    // Ensure day and month have 2 digits
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses Italian amount format to number
 * Handles formats like: 1.234,56 -> 1234.56, or 4,99 -> 4.99
 */
export function parseItalianAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Remove non-numeric characters except comma, period, and minus sign
  let cleanAmount = amountStr.replace(/[^\d,.-]/g, '');
  
  // Handle Italian format: 1.234,56 -> 1234.56
  if (cleanAmount.includes(',')) {
    // If it contains both period and comma, period is thousands separator
    if (cleanAmount.includes('.') && cleanAmount.includes(',')) {
      cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
    } else {
      // Only comma = decimal separator
      cleanAmount = cleanAmount.replace(',', '.');
    }
  }
  
  const amount = parseFloat(cleanAmount);
  return isNaN(amount) ? 0 : Math.abs(amount);
}

/**
 * Cleans and normalizes transaction descriptions
 */
export function cleanDescription(description: string): string {
  if (!description) return 'Transazione';
  
  // Remove extra spaces and control characters
  return description.trim().replace(/\s+/g, ' ') || 'Transazione';
}

/**
 * Transaction pattern detection for PDF parsing
 */
export interface TransactionPattern {
  date1?: string;
  date2?: string;
  amount: string;
  description: string;
  type: 'income' | 'expense';
  operationType?: string;
}

/**
 * Parses a line from Italian bank statement PDF
 * Returns null if line doesn't match any transaction pattern
 */
export function parseTransactionLine(line: string): TransactionPattern | null {
  if (!line || line.trim().length < 10) return null;
  
  // Pattern 1: Standard transaction with two dates
  // Example: "02/07/24   29/06/24   4,99   PAGAMENTO   POS   29/06/2024   20.42 Google   YouTube Member London   GBR   OPERAZIONE   644320   CARTA   65346485"
  const pattern1 = /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+([\d,]+)\s+(PAGAMENTO\s+POS|BONIFICO|ADDEBITO|POSTAGIRO|ACCR\.?\s?RIC\.?)\s+(.+)/i;
  const match1 = line.match(pattern1);
  
  if (match1) {
    const [, date1, date2, amount, operationType, description] = match1;
    const cleanedDesc = extractMeaningfulDescription(description, operationType);
    return {
      date1: formatItalianDate(date1),
      date2: formatItalianDate(date2),
      amount,
      description: cleanedDesc,
      type: determineTransactionType(operationType, description),
      operationType
    };
  }
  
  // Pattern 2: Single date transaction
  // Example: "08/07/24   08/07/24   5,99   ADDEBITO DIRETTO   SDD   ILIAD CID.IT46ZZZ0000013970161009"
  const pattern2 = /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+([\d,]+)\s+(.+)/i;
  const match2 = line.match(pattern2);
  
  if (match2) {
    const [, date1, date2, amount, fullDescription] = match2;
    // Extract operation type from description
    const operationMatch = fullDescription.match(/^(ADDEBITO|BONIFICO|POSTAGIRO|IMPOSTA|STIPENDIO|PRELIEVO|F24)/i);
    const operationType = operationMatch ? operationMatch[1] : '';
    const cleanedDesc = extractMeaningfulDescription(fullDescription, operationType);
    
    return {
      date1: formatItalianDate(date1),
      date2: formatItalianDate(date2),
      amount,
      description: cleanedDesc,
      type: determineTransactionType(operationType, fullDescription),
      operationType
    };
  }
  
  // Pattern 3: Amount-first pattern (for some special cases)
  const pattern3 = /(\d{2}\/\d{2}\/\d{2})\s+[\d,]+\s+(.+)/i;
  const match3 = line.match(pattern3);
  
  if (match3) {
    const amountMatch = line.match(/([\d,]+)/);
    if (amountMatch) {
      const [, date, description] = match3;
      const cleanedDesc = extractMeaningfulDescription(description, '');
      return {
        date1: formatItalianDate(date),
        amount: amountMatch[1],
        description: cleanedDesc,
        type: determineTransactionType('', description)
      };
    }
  }
  
  return null;
}

/**
 * Extracts meaningful description from transaction text
 * Focuses on merchant names, purposes, and key identifiers
 */
function extractMeaningfulDescription(description: string, operationType: string): string {
  if (!description) return 'Transazione';
  
  let cleaned = description.trim();
  
  // Remove common trailing codes that don't add value
  cleaned = cleaned
    .replace(/\s*OPERAZIONE\s+\d+\s*CARTA\s+\d+$/i, '') // Remove "OPERAZIONE 644320 CARTA 65346485"
    .replace(/\s*TRN\s+[A-Z0-9]+$/i, '') // Remove trailing TRN codes at end
    .replace(/\s*BPPIITRR(XXX)?$/i, '') // Remove bank codes
    .replace(/\s*BITAITRRXXX$/i, '')
    .replace(/\s*BNLIITRRXXX$/i, '')
    .replace(/\s*CID\.[A-Z0-9]+\s+\d+\s+MAN\.[A-Z0-9-]+$/i, '') // Remove SDD codes
    .trim();
  
  // For different operation types, extract relevant information
  if (operationType.includes('PAGAMENTO POS')) {
    // For POS payments, focus on merchant name and location
    // Pattern: "29/06/2024 20.42 Google YouTube Member London GBR"
    const merchantMatch = cleaned.match(/\d{2}\/\d{2}\/\d{4}\s+[\d.]+\s+(.+?)(?:\s+[A-Z]{3}\s*$|$)/);
    if (merchantMatch) {
      return cleanDescription(merchantMatch[1]);
    }
    
    // Fallback: try to extract meaningful part after datetime
    const timeMatch = cleaned.match(/\d{2}\/\d{2}\/\d{4}\s+[\d.]+\s+(.+)/);
    if (timeMatch) {
      return cleanDescription(timeMatch[1]);
    }
  } else if (operationType.includes('BONIFICO')) {
    // For transfers, focus on recipient and purpose
    // Pattern: "A Monica Maurizzi per thanks" or "Da LIBERTI MARCO COSIMO SABRINA per amazon"
    const transferMatch = cleaned.match(/(?:A|Da)\s+([^T]+?)(?:\s+TRN|$)/i);
    if (transferMatch) {
      return cleanDescription(transferMatch[1]);
    }
  } else if (operationType.includes('ADDEBITO')) {
    // For direct debits, focus on company/service name
    // Pattern: "DIRETTO SDD ILIAD" or "DIRETTO SDD** TeamSystem Pa"
    const debitMatch = cleaned.match(/DIRETTO\s+SDD\*?\*?\s+([^C]+?)(?:\s+CID|$)/i);
    if (debitMatch) {
      return cleanDescription(debitMatch[1]);
    }
  } else if (operationType.includes('POSTAGIRO')) {
    // For internal transfers
    const giroMatch = cleaned.match(/Da\s+([^T]+?)(?:\s+TRN|$)/i);
    if (giroMatch) {
      return cleanDescription(giroMatch[1]);
    }
  }
  
  // For other cases, try to extract the most meaningful part
  // Remove dates, times, and codes but keep merchant/description
  cleaned = cleaned
    .replace(/^\d{2}\/\d{2}\/\d{4}\s+[\d.]+\s+/, '') // Remove leading date/time
    .replace(/\s+[A-Z]{3}(\s+OPERAZIONE|\s*$)/, '') // Remove country codes
    .replace(/\s+OPERAZIONE.*$/, '') // Remove operation details
    .trim();
  
  return cleanDescription(cleaned) || 'Transazione';
}

/**
 * Determines if a transaction is income or expense based on operation type and description
 */
export function determineTransactionType(operationType: string, description: string): 'income' | 'expense' {
  const opType = operationType.toLowerCase();
  const desc = description.toLowerCase();
  
  // Strong income indicators - these should always be income
  const incomeKeywords = [
    'stipendio', 'salary', 'salario', 'pensione', 'pension',
    'accredito', 'accr', 'ricarica', 'rimborso', 'refund',
    'versamento', 'deposito', 'bonifico da', 'bonifico ricevuto',
    'interesse', 'dividendo', 'rendita', 'entrata'
  ];
  
  // Strong expense indicators - these should always be expense
  const expenseKeywords = [
    'pagamento', 'pos', 'addebito', 'prelievo', 'withdrawal',
    'commissione', 'imposta', 'tassa', 'bollettino', 'f24',
    'pedaggio', 'multa', 'bonifico a', 'bonifico verso',
    'carta', 'bancomat', 'commissioni'
  ];
  
  // Check for income patterns first
  if (incomeKeywords.some(keyword => desc.includes(keyword)) ||
      opType.includes('accr')) { // ACCR. RIC. (Accredito Ricarica)
    return 'income';
  }
  
  // Specific logic for POSTAGIRO (internal transfers)
  if (opType.includes('postagiro')) {
    // POSTAGIRO "Da [nome]" = income (money coming from someone)
    // POSTAGIRO "A [nome]" or other = expense (money going to someone)
    if (/\bda\s+[a-zA-Z]/i.test(desc)) {
      return 'income';
    } else {
      return 'expense';
    }
  }
  
  // Specific logic for BONIFICO (bank transfers)
  if (opType.includes('bonifico')) {
    // BONIFICO "Da [nome]" = income (money received from someone)
    // BONIFICO "A [nome]" = expense (money sent to someone)
    if (/\bda\s+[a-zA-Z]/i.test(desc)) {
      return 'income';
    } else if (/\ba\s+[a-zA-Z]/i.test(desc)) {
      return 'expense';
    }
    // If no clear direction, check for other income indicators
    else if (desc.includes('stipendio') || desc.includes('salary') || desc.includes('accredito')) {
      return 'income';
    } else {
      return 'expense'; // Default for bonifico without clear direction
    }
  }
  
  // Check for expense patterns
  if (expenseKeywords.some(keyword => desc.includes(keyword)) ||
      opType.includes('pagamento') ||
      opType.includes('addebito') ||
      opType.includes('imposta')) {
    return 'expense';
  }
  
  // Additional heuristics based on common Italian banking patterns
  
  // If description contains "DA" followed by a name, it's likely income
  if (/\bda\s+[a-z]+/i.test(desc)) {
    return 'income';
  }
  
  // If description contains "A" or "VERSO" followed by a name, it's likely expense
  if (/\b(a|verso)\s+[a-z]+/i.test(desc)) {
    return 'expense';
  }
  
  // For ambiguous cases, try to analyze the context more
  // If it's a transfer without clear direction indicators, look for other clues
  if (opType.includes('bonifico') || opType.includes('postagiro')) {
    // Check for business names or services in expense context
    if (/\b(srl|spa|snc|sas|ltd|gmbh|sarl|amazon|google|microsoft|apple|netflix|spotify)\b/i.test(desc)) {
      return 'expense';
    }
    
    // Check for personal names in income context (salary, freelance payments)
    if (/\b(dott|ing|prof|sig|mr|ms|ltd)\b/i.test(desc)) {
      return 'income';
    }
  }
  
  // Conservative default: if unclear, classify as expense
  // This is safer for budgeting as it avoids overestimating income
  return 'expense';
}

/**
 * Extracts the main transaction date (prefers "data valuta" over "data contabile")
 */
export function getMainTransactionDate(pattern: TransactionPattern): string {
  // For Italian statements, date2 is usually "data valuta" (value date)
  // which is more accurate for financial calculations
  return pattern.date2 || pattern.date1 || new Date().toISOString().split('T')[0];
}

/**
 * Generates a unique transaction ID based on content
 */
export function generateTransactionId(date: string, amount: number, description: string, index: number, source: 'pdf' | 'xlsx' = 'pdf'): string {
  const cleanDesc = description.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  return `${source}-${date}-${amount}-${cleanDesc}-${index}`;
}