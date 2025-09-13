import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@/types/transaction';
import * as XLSX from 'xlsx';
import { insertTransactions, getParsedData, saveFileBalance } from '@/lib/database';
import { categorizeTransaction } from '@/lib/categorizer';
import { 
  formatItalianDate, 
  parseItalianAmount, 
  cleanDescription,
  generateTransactionId 
} from '@/lib/parsingUtils';

/**
 * Extracts balance from XLSX data
 * Looks for "Saldo disponibile:" pattern
 */
function extractBalanceFromXLSX(jsonData: unknown[]): { balance: number | null; pattern?: string; date?: string } {
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i] as string[];
    if (!row || row.length === 0) continue;
    
    // Check each cell in the row for balance pattern
    for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
      const cellValue = row[cellIndex]?.toString() || '';
      
      if (cellValue.toLowerCase().includes('saldo disponibile:')) {
        
        // Look for amount in the same cell or adjacent cells
        let balance = null;
        
        // First try to extract from same cell (after the colon)
        // Handle formats like: "Saldo disponibile: +8.824,07 Euro", "Saldo disponibile: 1.234,56", "Saldo disponibile: 999,99"
        const sameCell = cellValue.match(/saldo disponibile:\s*[+\-]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+)(?:\s*euro)?/i);
        if (sameCell) {
          balance = parseItalianAmount(sameCell[1]);
        } else {
          // Try adjacent cells in the same row
          for (let j = cellIndex + 1; j < row.length && j <= cellIndex + 3; j++) {
            const adjacentCell = row[j]?.toString() || '';
            const amountMatch = adjacentCell.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+)/);
            if (amountMatch) {
              balance = parseItalianAmount(amountMatch[1]);
              break;
            }
          }
        }
        
        if (balance !== null) {
          // Try to find a date in the same row or nearby rows
          let balanceDate = undefined;
          for (let dateRow = Math.max(0, i - 2); dateRow <= Math.min(jsonData.length - 1, i + 2); dateRow++) {
            const searchRow = jsonData[dateRow] as string[];
            if (!searchRow) continue;
            
            for (const cell of searchRow) {
              const dateMatch = cell?.toString().match(/\b(\d{2})\/(\d{2})\/(\d{2,4})\b/);
              if (dateMatch) {
                balanceDate = formatItalianDate(dateMatch[0]);
                break;
              }
            }
            if (balanceDate) break;
          }
          
          return {
            balance,
            pattern: 'Saldo disponibile:',
            date: balanceDate
          };
        }
      }
    }
  }
  
  return { balance: null };
}

export async function POST(request: NextRequest) {
  try {
    
    // Check if request has the correct content type for form data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'File Excel richiesto (.xlsx o .xls)' }, { status: 400 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    
    if (!file || !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: 'File Excel richiesto (.xlsx o .xls)' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    
    // Check if buffer is too small (likely corrupted)
    if (buffer.byteLength < 100) {
      return NextResponse.json({ error: 'File Excel troppo piccolo o corrotto' }, { status: 400 });
    }
    
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Usa il primo foglio di lavoro
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Check if worksheet is empty
    if (!worksheet['!ref']) {
      return NextResponse.json({ error: 'Il file Excel è vuoto' }, { status: 400 });
    }
    
    // Converti in JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Check for corrupted data (all cells showing as [object Object])
    const hasCorruptedData = jsonData.some(row => 
      Array.isArray(row) && row.some(cell => 
        typeof cell === 'object' && cell !== null && cell.toString() === '[object Object]'
      )
    );
    
    if (hasCorruptedData) {
      return NextResponse.json({ 
        error: 'Il file Excel contiene dati corrotti. Prova a salvare nuovamente il file in formato Excel.' 
      }, { status: 400 });
    }
    
    
    // Extract balance from XLSX data
    const balanceInfo = extractBalanceFromXLSX(jsonData);
    
    const transactions: Transaction[] = [];
    
    // Trova la riga con gli header delle colonne
    let headerRowIndex = -1;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as string[];
      if (row && row.length > 0) {
        const firstCell = row[0]?.toString().toLowerCase() || '';
        // Cerca la riga che contiene "Data Contabile" o "Data"
        if (firstCell.includes('data contabile') || firstCell.includes('data') && row.length > 3) {
          headerRowIndex = i;
          break;
        }
      }
    }
    
    
    if (headerRowIndex === -1) {
      throw new Error('Non riesco a trovare gli header delle colonne nel file Excel');
    }
    
    // Estrai gli header
    const headers = jsonData[headerRowIndex] as string[];
    
    // Trova gli indici delle colonne
    let dataContabileIndex = -1;
    let dataValutaIndex = -1;
    let addebitiIndex = -1;
    let accreditiIndex = -1;
    let descrizioneIndex = -1;
    
    headers.forEach((header, index) => {
      const headerStr = header?.toString().toLowerCase() || '';
      if (headerStr.includes('data contabile')) dataContabileIndex = index;
      else if (headerStr.includes('data valuta')) dataValutaIndex = index;
      else if (headerStr.includes('addebiti')) addebitiIndex = index;
      else if (headerStr.includes('accrediti')) accreditiIndex = index;
      else if (headerStr.includes('descrizione')) descrizioneIndex = index;
    });
    
    // Processa le righe di dati (dopo gli header)
    const dataRows = jsonData.slice(headerRowIndex + 1) as string[][];
    
    dataRows.forEach((row, index) => {
      if (!row || row.length === 0) return;
      
      // Estrai entrambe le date
      const dataContabileStr = row[dataContabileIndex]?.toString() || '';
      const dataValutaStr = row[dataValutaIndex]?.toString() || '';
      const description = row[descrizioneIndex]?.toString() || '';
      const addebitoStr = row[addebitiIndex]?.toString() || '';
      const accreditoStr = row[accreditiIndex]?.toString() || '';
      
      // Salta righe vuote
      if (!dataContabileStr && !dataValutaStr && !description && !addebitoStr && !accreditoStr) return;
      
      // Prova a parsare entrambe le date
      let date = '';
      let dataValuta = '';
      
      if (dataContabileStr) {
        date = formatItalianDate(dataContabileStr);
      }
      if (dataValutaStr) {
        dataValuta = formatItalianDate(dataValutaStr);
      }
      
      // Usa SEMPRE la data valuta come data principale. Se non disponibile, usa data contabile
      const mainDate = dataValuta || date;
      
      // Processa gli importi
      let amount = 0;
      let isExpense = false;
      
      if (addebitoStr) {
        // Addebito = spesa (negativo)
        amount = parseItalianAmount(addebitoStr);
        isExpense = true;
      } else if (accreditoStr) {
        // Accredito = entrata (positivo)
        amount = parseItalianAmount(accreditoStr);
        isExpense = false;
      }
      
      if (amount > 0.01 && mainDate && description) {
        // Generate unique ID using shared utility
        const uniqueId = generateTransactionId(mainDate, amount, cleanDescription(description), index, 'xlsx');
        
        const transaction: Transaction = {
          id: uniqueId,
          date: mainDate, // Usa SEMPRE la data valuta come data principale
          dataValuta: dataValuta, // Mantieni per riferimento
          amount,
          description: cleanDescription(description),
          category: categorizeTransaction({
            id: uniqueId,
            date: mainDate,
            amount,
            description: cleanDescription(description),
            type: isExpense ? 'expense' : 'income',
            is_manual_override: false,
            manual_category_id: null
          } as Transaction),
          type: isExpense ? 'expense' : 'income',
        };
        
        transactions.push(transaction);
      }
    });
    
    // Salva le transazioni nel database (evita automaticamente i duplicati)
    const { inserted, duplicates } = insertTransactions(transactions);
    
    // Save balance to file_balances table if found
    if (balanceInfo.balance !== null) {
      const balanceId = saveFileBalance(
        file.name,
        balanceInfo.balance,
        'xlsx',
        balanceInfo.date,
        balanceInfo.pattern
      );
      
      if (balanceId) {
      } else {
      }
    } else {
    }
    
    // Recupera tutti i dati dal database (incluse le transazioni esistenti)
    const allData = getParsedData();
    
    return NextResponse.json({
      ...allData,
      _uploadStats: {
        newTransactions: inserted,
        duplicatesIgnored: duplicates,
        totalInFile: transactions.length
      }
    });
  } catch (error) {
    console.error('Errore parsing Excel:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'elaborazione del file Excel' }, 
      { status: 500 }
    );
  }
}

// Utility functions moved to shared parsingUtils.ts

// Categorization logic moved to centralized categorizer engine