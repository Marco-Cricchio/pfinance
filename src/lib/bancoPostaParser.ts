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
    
    // Skip header row
    if (inMovimentiSection && !headerParsed && 
        (line.includes('Data Contabile') || line.includes('Data Valuta') || line.includes('Descrizione'))) {
      headerParsed = true;
      continue;
    }
    
    // Parse transaction lines
    if (inMovimentiSection && headerParsed && line.length > 20) {
      // Skip non-transaction lines
      if (line.includes('Pag.') || 
          line.includes('BancoPosta') ||
          line.includes('Posteitaliane') ||
          line.includes('SALDO') ||
          line.includes('RIEPILOGO') ||
          !line.match(/\d{2}\/\d{2}\/\d{4}/)) {
        continue;
      }
      
      // Try to parse as transaction line
      // BancoPosta format: Data Contabile | Data Valuta | Descrizione | Addebiti | Accrediti
      // We need to be smart about parsing since the table format can vary
      
      const dateMatches = [...line.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)];
      
      if (dateMatches.length >= 2) {
        const dataContabile = dateMatches[0][1];
        const dataValuta = dateMatches[1][1];
        
        // Find the description between the second date and the amounts
        const secondDateIndex = dateMatches[1].index! + dateMatches[1][0].length;
        const remainingLine = line.substring(secondDateIndex).trim();
        
        // Look for amounts at the end of the line
        const amountMatches = [...remainingLine.matchAll(/([\d.,]+)/g)];
        
        if (amountMatches.length > 0) {
          // Get the last amount (could be debit or credit)
          const lastAmount = amountMatches[amountMatches.length - 1][1];
          const amountIndex = remainingLine.lastIndexOf(lastAmount);
          
          // Description is everything before the last amount
          const description = remainingLine.substring(0, amountIndex).trim();
          
          // Determine if it's debit or credit based on context or amount position
          let addebiti = '';
          let accrediti = '';
          
          // Simple heuristic: if description suggests expense, treat as debit
          const descLower = description.toLowerCase();
          if (descLower.includes('pagamento') || descLower.includes('prelievo') || 
              descLower.includes('addebito') || descLower.includes('pedaggio')) {
            addebiti = lastAmount;
          } else {
            // For now, assume most transactions are expenses unless clearly income
            // This can be refined based on the description content
            addebiti = lastAmount;
          }
          
          const rawTransaction = parseTransactionRow(
            dataContabile,
            dataValuta,
            description,
            addebiti,
            accrediti
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