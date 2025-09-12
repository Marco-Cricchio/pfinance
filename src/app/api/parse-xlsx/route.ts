import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@/types/transaction';
import * as XLSX from 'xlsx';
import { insertTransactions, getParsedData } from '@/lib/database';
import { categorizeTransaction } from '@/lib/categorizer';

export async function POST(request: NextRequest) {
  try {
    console.log('=== XLSX Parse API Called ===');
    
    // Check if request has the correct content type for form data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      console.log('Invalid content type:', contentType);
      return NextResponse.json({ error: 'File Excel richiesto (.xlsx o .xls)' }, { status: 400 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('File received:', file ? file.name : 'NO FILE');
    console.log('File size:', file ? file.size : 'N/A');
    console.log('File type:', file ? file.type : 'N/A');
    
    if (!file || !file.name.match(/\.(xlsx|xls)$/i)) {
      console.log('Invalid file type');
      return NextResponse.json({ error: 'File Excel richiesto (.xlsx o .xls)' }, { status: 400 });
    }

    console.log('Reading file buffer...');
    const buffer = await file.arrayBuffer();
    console.log('Buffer size:', buffer.byteLength);
    
    // Check if buffer is too small (likely corrupted)
    if (buffer.byteLength < 100) {
      console.log('File too small, likely corrupted');
      return NextResponse.json({ error: 'File Excel troppo piccolo o corrotto' }, { status: 400 });
    }
    
    console.log('Parsing with XLSX...');
    const workbook = XLSX.read(buffer, { type: 'array' });
    console.log('Workbook sheet names:', workbook.SheetNames);
    
    // Usa il primo foglio di lavoro
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log('Worksheet range:', worksheet['!ref']);
    
    // Check if worksheet is empty
    if (!worksheet['!ref']) {
      console.log('Worksheet is empty');
      return NextResponse.json({ error: 'Il file Excel è vuoto' }, { status: 400 });
    }
    
    // Converti in JSON
    console.log('Converting to JSON with header: 1...');
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('JSON data rows:', jsonData.length);
    
    // Check for corrupted data (all cells showing as [object Object])
    const hasCorruptedData = jsonData.some(row => 
      Array.isArray(row) && row.some(cell => 
        typeof cell === 'object' && cell !== null && cell.toString() === '[object Object]'
      )
    );
    
    if (hasCorruptedData) {
      console.log('Detected corrupted data in Excel file');
      return NextResponse.json({ 
        error: 'Il file Excel contiene dati corrotti. Prova a salvare nuovamente il file in formato Excel.' 
      }, { status: 400 });
    }
    
    console.log('First 3 rows:', JSON.stringify(jsonData.slice(0, 3), null, 2));
    
    const transactions: Transaction[] = [];
    
    // Trova la riga con gli header delle colonne
    console.log('Searching for headers...');
    let headerRowIndex = -1;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as string[];
      if (row && row.length > 0) {
        const firstCell = row[0]?.toString().toLowerCase() || '';
        console.log(`Row ${i} first cell:`, firstCell, 'Row length:', row.length);
        // Cerca la riga che contiene "Data Contabile" o "Data"
        if (firstCell.includes('data contabile') || firstCell.includes('data') && row.length > 3) {
          console.log(`Found header row at index ${i}`);
          headerRowIndex = i;
          break;
        }
      }
    }
    
    console.log('Final headerRowIndex:', headerRowIndex);
    
    if (headerRowIndex === -1) {
      console.log('ERROR: Headers not found. Full data dump:');
      console.log(JSON.stringify(jsonData, null, 2));
      throw new Error('Non riesco a trovare gli header delle colonne nel file Excel');
    }
    
    // Estrai gli header
    const headers = jsonData[headerRowIndex] as string[];
    console.log('Headers trovati:', headers);
    
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
        // Genera un ID più unico basato sul contenuto della transazione
        const uniqueId = `xlsx-${mainDate}-${amount}-${description.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}-${index}`;
        
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

function formatItalianDate(dateStr: string): string {
  // Rimuovi spazi extra
  const cleanDateStr = dateStr.trim();
  
  // Se è un numero Excel, convertilo in data
  if (!isNaN(Number(cleanDateStr))) {
    const excelDate = new Date((Number(cleanDateStr) - 25569) * 86400 * 1000);
    return excelDate.toISOString().split('T')[0];
  }
  
  // Formato italiano: DD/MM/YYYY
  const italianDateMatch = cleanDateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (italianDateMatch) {
    let [, day, month, year] = italianDateMatch;
    
    // Gestisce anni a 2 cifre
    if (year.length === 2) {
      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100;
      const twoDigitYear = parseInt(year);
      year = String(twoDigitYear > 50 ? currentCentury - 100 + twoDigitYear : currentCentury + twoDigitYear);
    }
    
    // Assicura che giorno e mese abbiano 2 cifre
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

function parseItalianAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Rimuovi caratteri non numerici eccetto virgola, punto e segno meno
  let cleanAmount = amountStr.replace(/[^\d,.-]/g, '');
  
  // Gestisce formato italiano: 1.234,56 -> 1234.56
  if (cleanAmount.includes(',')) {
    // Se contiene sia punto che virgola, il punto è il separatore delle migliaia
    if (cleanAmount.includes('.') && cleanAmount.includes(',')) {
      cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
    } else {
      // Solo virgola = separatore decimale
      cleanAmount = cleanAmount.replace(',', '.');
    }
  }
  
  const amount = parseFloat(cleanAmount);
  return isNaN(amount) ? 0 : Math.abs(amount);
}

function cleanDescription(description: string): string {
  if (!description) return 'Transazione Excel';
  
  // Rimuovi spazi extra e caratteri di controllo
  return description.trim().replace(/\s+/g, ' ') || 'Transazione Excel';
}

// Categorization logic moved to centralized categorizer engine