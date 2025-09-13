/**
 * Parser for BancoPosta statement format
 * Handles the specific structure of BancoPosta PDF statements
 */

import { Transaction } from '@/types/transaction';
import { 
  parseItalianAmount, 
  formatItalianDate, 
  cleanDescription, 
  generateTransactionId,
  determineTransactionType 
} from './parsingUtils';

/**
 * Structure representing a BancoPosta account balance
 */
export interface BancoPostaBalance {
  accountBalance: number | null;
  availableBalance: number | null;
  date: string | null;
}

/**
 * Raw transaction row from BancoPosta statement
 */
interface BancoPostaRawTransaction {
  dataContabile: string;
  dataValuta: string;
  descrizione: string;
  addebiti: string;
  accrediti: string;
}

/**
 * Extracts account information from BancoPosta statement header
 */
function extractAccountInfo(text: string): { iban?: string; accountHolder?: string; statementDate?: string } {
  const lines = text.split('\n');
  let iban: string | undefined;
  let accountHolder: string | undefined;
  let statementDate: string | undefined;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Extract IBAN
    const ibanMatch = trimmedLine.match(/IBAN\s+(IT[A-Z0-9]{25})/);
    if (ibanMatch) {
      iban = ibanMatch[1];
    }
    
    // Extract account holder
    const holderMatch = trimmedLine.match(/INTESTATO A\s+(.+)$/);
    if (holderMatch) {
      accountHolder = holderMatch[1].trim();
    }
    
    // Extract statement date from header
    const dateMatch = trimmedLine.match(/(\d{2})\s+SETTEMBRE\s+(\d{4})/i);
    if (dateMatch) {
      const day = dateMatch[1];
      const year = dateMatch[2];
      statementDate = formatItalianDate(`${day}/09/${year}`);
    }
  }
  
  return { iban, accountHolder, statementDate };
}

/**
 * Extracts balance information from BancoPosta statement
 */
function extractBalance(text: string): BancoPostaBalance {
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim().toUpperCase();
    
    // Look for balance information
    // Format: "SALDO CONTABILE +8.847,41 € SALDO DISPONIBILE +8.824,07 €"
    const balanceMatch = line.match(/SALDO CONTABILE\s*([+-]?[\d.,]+)\s*€\s*SALDO DISPONIBILE\s*([+-]?[\d.,]+)\s*€/i);
    if (balanceMatch) {
      const accountBalance = parseItalianAmount(balanceMatch[1]);
      const availableBalance = parseItalianAmount(balanceMatch[2]);
      
      // Try to extract date from same section
      const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const date = dateMatch ? formatItalianDate(dateMatch[0]) : null;
      
      return {
        accountBalance,
        availableBalance,
        date
      };
    }
  }
  
  return {
    accountBalance: null,
    availableBalance: null,
    date: null
  };
}

/**
 * Parses a transaction row from the LISTA MOVIMENTI table
 */
function parseTransactionRow(
  dataContabile: string,
  dataValuta: string, 
  descrizione: string,
  addebiti: string,
  accrediti: string
): BancoPostaRawTransaction | null {
  // Validate dates
  const dataContabileMatch = dataContabile.match(/\d{2}\/\d{2}\/\d{4}/);
  const dataValutaMatch = dataValuta.match(/\d{2}\/\d{2}\/\d{4}/);
  
  if (!dataContabileMatch || !dataValutaMatch || !descrizione.trim()) {
    return null;
  }
  
  return {
    dataContabile: dataContabile.trim(),
    dataValuta: dataValuta.trim(),
    descrizione: descrizione.trim(),
    addebiti: addebiti ? addebiti.trim() : '',
    accrediti: accrediti ? accrediti.trim() : ''
  };
}

/**
 * Converts BancoPosta raw transaction to standard Transaction format
 */
function convertToTransaction(raw: BancoPostaRawTransaction, index: number): Transaction | null {
  // Determine amount and type
  let amount = 0;
  let type: 'income' | 'expense' = 'expense';
  
  if (raw.accrediti && parseItalianAmount(raw.accrediti) > 0) {
    // Credit = income
    amount = parseItalianAmount(raw.accrediti);
    type = 'income';
  } else if (raw.addebiti && parseItalianAmount(raw.addebiti) > 0) {
    // Debit = expense  
    amount = parseItalianAmount(raw.addebiti);
    type = 'expense';
  } else {
    return null; // No valid amount found
  }
  
  // Clean and process description
  const cleanedDescription = cleanDescription(raw.descrizione);
  
  // Detect transaction type from description if possible
  const detectedType = determineTransactionType('', cleanedDescription);
  
  // Use the detected type if it's more specific than our amount-based detection
  const finalType = detectedType;
  
  // Use data valuta as main date (more accurate for financial calculations)
  const mainDate = formatItalianDate(raw.dataValuta);
  
  // Generate unique ID
  const id = generateTransactionId(mainDate, amount, cleanedDescription, index, 'pdf');
  
  return {
    id,
    date: mainDate,
    dataValuta: mainDate,
    amount,
    description: cleanedDescription,
    type: finalType,
    category: '', // Will be assigned by categorizer
    is_manual_override: false,
    manual_category_id: null
  };
}

/**
 * Main parser function for BancoPosta statements
 */
export function parseBancoPosta(text: string): {
  transactions: Transaction[];
  balance: BancoPostaBalance;
  accountInfo: { iban?: string; accountHolder?: string; statementDate?: string };
} {
  // Extract account information
  const accountInfo = extractAccountInfo(text);
  
  // Extract balance
  const balance = extractBalance(text);
  
  // Find the LISTA MOVIMENTI section
  const lines = text.split('\n');
  let inMovimentiSection = false;
  let headerParsed = false;
  const transactions: Transaction[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect start of LISTA MOVIMENTI section
    if (line.includes('LISTA MOVIMENTI') || line.includes('Data Contabile')) {
      inMovimentiSection = true;
      continue;
    }
    
    // Skip header row - BancoPosta format detection
    if (inMovimentiSection && !headerParsed) {
      // Look for header indicators in BancoPosta format
      if (line.includes('Data Contabile') || 
          line.includes('Data Valuta') || 
          line.includes('Descrizione operazioni') ||
          line.includes('Addebiti') ||
          line.includes('Accrediti')) {
        headerParsed = true;
        continue;
      }
      // If we find transaction-like data without a clear header, start parsing
      if (line.match(/\d{2}\/\d{2}\/\d{4}/) && line.length > 30) {
        headerParsed = true;
        // Don't continue, process this line as a transaction
      }
    }
    
    
    // Parse transaction lines - BancoPosta multi-line format
    if (inMovimentiSection && headerParsed) {
      
      // Skip non-transaction lines
      if (line.includes('Pag.') || 
          line.includes('BancoPosta') ||
          line.includes('Posteitaliane') ||
          line.includes('SALDO') ||
          line.includes('RIEPILOGO') ||
          line.trim() === '') {
        continue;
      }
      
      // BancoPosta format is multi-line per transaction:
      // Line 1: Description + operation details (no dates)
      // Line 2: Data Contabile + Data Valuta + Amount  
      // Line 3: Card details (optional)
      
      // Check if this is a "date line" with exactly 2 dates and an amount
      const dateMatches = [...line.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)];
      const amountMatch = line.match(/([\d]+[,.]\d{2})\s*$/);
      
      if (dateMatches.length === 2 && amountMatch) {
        const dataContabile = dateMatches[0][1];
        const dataValuta = dateMatches[1][1];
        const amount = amountMatch[1];
        
        // Look backwards for the description line and forward for card info
        let description = '';
        let cardInfo = '';
        
        // Find description line (previous non-date line)
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim();
          if (prevLine && 
              !prevLine.includes('Pag.') && 
              !prevLine.match(/^\d{2}\/\d{2}\/\d{4}/) &&
              prevLine.length > 10) {
            description = prevLine;
            break;
          }
        }
        
        // Look forward for additional info (next line usually contains additional transaction details)
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          // Include the next line if it's not empty, not a page number, and doesn't look like a new transaction
          if (nextLine && 
              !nextLine.includes('Pag.') && 
              !nextLine.includes('BancoPosta') &&
              !nextLine.includes('Posteitaliane') &&
              !nextLine.includes('SALDO') &&
              !nextLine.includes('RIEPILOGO') &&
              !nextLine.match(/^\d{2}\/\d{2}\/\d{4}/) && // Not starting with a date (new transaction)
              nextLine.length > 3 && // Not just ****
              nextLine.length < 100) { // Reasonable length
            cardInfo = nextLine;
          }
        }
        
        // Reconstruct complete description in normalized format
        if (description) {
          let completeDescription = description;
          
          // Normalize operation codes (OP. -> Op.)
          completeDescription = completeDescription.replace(/\bOP\./g, 'Op.');
          
          // Add card info if available, normalizing the format
          if (cardInfo) {
            // Normalize card info (CARTA ****2943 -> carta ****2943)
            const normalizedCardInfo = cardInfo
              .replace(/^CARTA/i, 'carta')
              .replace(/^OP\./g, 'Op.');
            completeDescription += ' ' + normalizedCardInfo;
          }
        
          // Most BancoPosta transactions are expenses (addebiti)
          const rawTransaction = parseTransactionRow(
            dataContabile,
            dataValuta,
            completeDescription,
            amount, // addebiti (expense)
            ''      // accrediti (income)
          );
          
          if (rawTransaction) {
            const transaction = convertToTransaction(rawTransaction, transactions.length);
            if (transaction) {
              transactions.push(transaction);
            }
          }
        }
      }
    }
  }
  
  return {
    transactions,
    balance,
    accountInfo
  };
}

/**
 * Enhanced balance extraction specifically for BancoPosta format
 */
export function extractBancoPostaBalance(text: string): { balance: number | null; pattern?: string; date?: string } {
  const balance = extractBalance(text);
  
  if (balance.availableBalance !== null) {
    return {
      balance: balance.availableBalance,
      pattern: 'SALDO DISPONIBILE',
      date: balance.date || undefined
    };
  }
  
  if (balance.accountBalance !== null) {
    return {
      balance: balance.accountBalance,
      pattern: 'SALDO CONTABILE',
      date: balance.date || undefined
    };
  }
  
  return { balance: null };
}