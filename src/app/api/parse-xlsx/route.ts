import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@/types/transaction';
import * as XLSX from 'xlsx';
import { insertTransactions, getParsedData } from '@/lib/database';

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
          category: categorizeTransaction(description),
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

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  // New specific merchant mappings (highest priority)
  if (desc.includes('younited') || desc.includes('paga in 3 rate')) {
    return 'Rateizzazioni';
  }
  
  // Latest merchant mappings
  if (desc.includes('vannulo') || desc.includes('sesto') || desc.includes('motel la nuova fattori oricola') || 
      desc.includes('rifugio monte cagno rocca di camb') || desc.includes('booking.com')) {
    return 'Viaggi';
  }
  if (desc.includes('quantestorieli') || desc.includes('rif.f1aac360-a841-4')) {
    return 'Daniele';
  }
  if (desc.includes('tajo roma') || desc.includes('o bredy') || desc.includes('elior-poste') || 
      desc.includes("mc donald's") || desc.includes('old wild west') || desc.includes('la faggeta')) {
    return 'Ristorazione';
  }
  if (desc.includes('blue sky cafe') || desc.includes('max & fra') || desc.includes('di to ni srls')) {
    return 'Bar';
  }
  if (desc.includes('elba 2004 s.r.l.') || desc.includes('kiabi') || desc.includes('manhattan')) {
    return 'Abbigliamento';
  }
  if (desc.includes('lux eventi srl')) {
    return 'Svago';
  }
  if (desc.includes('vollera carmine') || desc.includes('buscaini angelo srl') || desc.includes('doc roma torresina')) {
    return 'Alimenti';
  }
  if (desc.includes('augustarello')) {
    return 'Benessere';
  }
  if (desc.includes('pecilli roberto roma')) {
    return 'Tabacchi';
  }
  if (desc.includes('x-ray radiologia')) {
    return 'Salute';
  }
  if (desc.includes('mamma arancina') || desc.includes('azienda agricola di ac nepi') || 
      desc.includes('eur cina') || desc.includes('deliveroo')) {
    return 'Ristorazione';
  }
  if (desc.includes('il gianfornaio')) {
    return 'Bar';
  }
  if (desc.includes('impianto tamoil') || desc.includes('staroil')) {
    return 'Trasporti';
  }
  if (desc.includes('farmaci torresina') || desc.includes('clinica villa chiara') || 
      desc.includes('dr fabio spina medico')) {
    return 'Salute';
  }
  if (desc.includes('caffe valentini')) {
    return 'Tabacchi';
  }
  if (desc.includes('spazio conad')) {
    return 'Alimenti';
  }
  if (desc.includes('decathlon') || desc.includes('okaidi italy')) {
    return 'Abbigliamento';
  }
  if (desc.includes('color hotel')) {
    return 'Svago';
  }
  if (desc.includes('apotheke gilfenklamm') || desc.includes('center casa') || 
      desc.includes('mayr christine') || desc.includes('eurospar es1') || 
      desc.includes('loacker') || desc.includes('momo fast food') || 
      desc.includes('choco passion') || desc.includes('gossyshop') || 
      desc.includes('biwak') || desc.includes('raiffeisen wippt') || 
      desc.includes('telepedaggio') || desc.includes('autogrill') || 
      desc.includes('mcdonald affi') || desc.includes('il pizzicagnolo')) {
    return 'Viaggi';
  }
  if (desc.includes('bollettino ama') || desc.includes('commissioni bollettino ama')) {
    return 'Utenze';
  }
  
  // Mapping specifici personalizzati esistenti (priorità massima)
  if (desc.includes('pos due p') || desc.includes('pos pim') || desc.includes('pos pane e salame') || 
      desc.includes('pos in\'s mercato') || desc.includes('pos macelleria') || desc.includes('arcaplanet') ||
      desc.includes('pos stazione frutta') || desc.includes('pos famila') || 
      desc.includes('pos vollera carmine') || desc.includes('pos buscaini angelo') ||
      desc.includes('pim cc') || desc.includes('due p 2010') || desc.includes('pim torresina') ||
      desc.includes('macelleria salumeria') || desc.includes('stazione frutta') ||
      desc.includes('in\'s mercato') || desc.includes('pane e salame') || desc.includes('global fish')) {
    return 'Alimenti';
  }
  if (desc.includes('pos cossuto') || desc.includes('pos brico point') || desc.includes('pos la satur') ||
      desc.includes('pos maury') || desc.includes('deghi s p a') || desc.includes('tedi') ||
      desc.includes('maury') || desc.includes('cossuto torrevecchia')) {
    return 'Casa';
  }
  if (desc.includes('pos acqu.distrib') || desc.includes('pos caffe la stella') || 
      desc.includes('pos mirko') || desc.includes('pos caffe valentini') ||
      desc.includes('acqu.distrib.automati') || desc.includes('mirko s.r.l.') ||
      desc.includes('masieri alessandro')) {
    return 'Bar';
  }
  if (desc.includes('pos windsurf') || desc.includes('pos claude.ai') || desc.includes('pos openrouter') ||
      desc.includes('pos requesty') || desc.includes('pos anthropic') || desc.includes('roblox') ||
      desc.includes('pos base44.com')) {
    return 'Abbonamenti';
  }
  if (desc.includes('pos tabacchi masieri') || desc.includes('pos masieri') ||
      desc.includes('pos ricevitoria')) {
    return 'Tabacchi';
  }
  if (desc.includes('pos kiabi') || desc.includes('pos cisalfa')) {
    return 'Abbigliamento';
  }
  if (desc.includes('pos enerpetroli') || desc.includes('enerpetroli') || desc.includes('octopus electroverse') ||
      desc.includes('boccea gomme')) {
    return 'Trasporti';
  }
  if (desc.includes('bollettino roma capitale')) {
    return 'Scuola';
  }
  if (desc.includes('pos casa novecento') || desc.includes('pos elior') || desc.includes('pos lievito') ||
      desc.includes('pos mc donald\'s') || desc.includes('pos deliveroo') || desc.includes('pos aperegina') ||
      desc.includes('la villetta') || desc.includes('four sisters') || desc.includes('justeatitaly') ||
      desc.includes('pizza & alici') || desc.includes('jimmy\'s') || desc.includes('alice pizza') ||
      desc.includes('agriresort') || desc.includes('az.agricol') || desc.includes('la brustola') ||
      desc.includes('gianni pizza al matton')) {
    return 'Ristorazione';
  }
  if (desc.includes('paypal *buy differe')) {
    return 'Noleggio_Cell';
  }
  if (desc.includes('pos farmaci torresina') || desc.includes('fanelli gianluigi') ||
      desc.includes('centro diagnostico')) {
    return 'Salute';
  }
  if (desc.includes('michetti elena') || desc.includes('pos sumup *quantestorieli') ||
      desc.includes('s.s.d. stelle marine') || desc.includes('fantasy paper')) {
    return 'Daniele';
  }
  if (desc.includes('pos augustarello')) {
    return 'Benessere';
  }
  if (desc.includes('pos chiosco') || desc.includes('pos piscine di vicenza') ||
      desc.includes('uci parco leonardo') || desc.includes('uci cinemas') || desc.includes('cc the wow')) {
    return 'Svago';
  }
  if (desc.includes('0689386461')) {
    return 'Utenze';
  }
  if (desc.includes('unaway hotel occhiobe') || desc.includes('pos a point') || desc.includes('th cadore') ||
      desc.includes('pos parkplatz') || desc.includes('pos talschlusshuette') || desc.includes('pos kaesereigen') ||
      desc.includes('pos adeg ebner') || desc.includes('pos spar') || desc.includes('pos loacker') ||
      desc.includes('pos mne*95023926happacher_') || desc.includes('sesto op') || desc.includes('pos nkd') ||
      desc.includes('pos billa') || desc.includes('pos hpb kassa') || desc.includes('bagnolo san') ||
      desc.includes('pos wycon') || desc.includes('pos terni reti') || desc.includes('pos cascata delle marmore') ||
      desc.includes('pos bkg*booking.com')) {
    return 'Viaggi';
  }
  
  // Condominio (priorità alta prima di bonifici generici)
  if (desc.includes('condominio')) {
    return 'Condominio';
  }
  
  // Mutuo (priorità alta prima di bonifici generici)
  if (desc.includes('per mut') || desc.includes('mutuo')) {
    return 'Mutuo';
  }
  
  // Assicurazioni (priorità alta prima di bonifici generici)
  if (desc.includes('assicurazione') || desc.includes('polizza') || desc.includes('generali') || desc.includes('axa') ||
      desc.includes('allianz') || desc.includes('unipol') || desc.includes('zurich')) {
    return 'Assicurazioni';
  }
  
  // Entrate (priorità alta)
  if (desc.includes('stipendio') || desc.includes('salary') || desc.includes('bonifico in entrata') || 
      desc.includes('accredito stipendio') || desc.includes('cedolino')) {
    return 'Stipendio';
  }
  if (desc.includes('pensione') || desc.includes('inps')) {
    return 'Pensione';
  }
  if (desc.includes('rimborso') || desc.includes('restituzione') || desc.includes('cashback')) {
    return 'Rimborsi';
  }
  
  // Spese bancarie e servizi
  if (desc.includes('commissioni') || desc.includes('spese') || desc.includes('canone') || 
      desc.includes('imposta di bollo') || desc.includes('bollo')) {
    return 'Spese Bancarie';
  }
  if (desc.includes('prelievo') || desc.includes('atm') || desc.includes('bancomat')) {
    return 'Prelievi';
  }
  if (desc.includes('bonifico') || desc.includes('giroconto') || desc.includes('trasferimento')) {
    return 'Trasferimenti';
  }
  
  // Spese quotidiane generiche
  if (desc.includes('supermercato') || desc.includes('alimentari') || desc.includes('grocery') || 
      desc.includes('conad') || desc.includes('coop') || desc.includes('esselunga') || desc.includes('carrefour') ||
      desc.includes('lidl') || desc.includes('eurospin') || desc.includes('penny') || desc.includes('md')) {
    return 'Alimenti';
  }
  if (desc.includes('benzina') || desc.includes('carburante') || desc.includes('fuel') || 
      desc.includes('eni') || desc.includes('agip') || desc.includes('q8') || desc.includes('esso') ||
      desc.includes('ip') || desc.includes('tamoil')) {
    return 'Trasporti';
  }
  if (desc.includes('ristorante') || desc.includes('restaurant') || desc.includes('pizzeria') || 
      desc.includes('trattoria') || desc.includes('osteria') || desc.includes('mcdonald') || 
      desc.includes('burger') || desc.includes('kfc')) {
    return 'Ristorazione';
  }
  if (desc.includes('bar') || desc.includes('caffe') || desc.includes('caffetteria')) {
    return 'Bar';
  }
  
  // Casa e utenze
  if (desc.includes('affitto') || desc.includes('rent') || desc.includes('mutuo') || 
      desc.includes('condominio') || desc.includes('amministratore') || desc.includes('brico') ||
      desc.includes('ferramenta') || desc.includes('casa')) {
    return 'Casa';
  }
  if (desc.includes('utenze') || desc.includes('luce') || desc.includes('gas') || desc.includes('acqua') ||
      desc.includes('enel') || desc.includes('eni plenitude') || desc.includes('utilities') ||
      desc.includes('tim') || desc.includes('vodafone') || desc.includes('wind') || desc.includes('iliad') ||
      desc.includes('telecom') || desc.includes('internet') || desc.includes('telefono')) {
    return 'Utenze';
  }
  
  // Altri trasporti
  if (desc.includes('trasporti') || desc.includes('autobus') || desc.includes('metro') || 
      desc.includes('trenitalia') || desc.includes('atac') || desc.includes('transport') ||
      desc.includes('taxi') || desc.includes('uber') || desc.includes('parcheggio') ||
      desc.includes('ztl') || desc.includes('autostrada') || desc.includes('pedaggio')) {
    return 'Trasporti';
  }
  
  // Salute
  if (desc.includes('medico') || desc.includes('farmacia') || desc.includes('health') || 
      desc.includes('ospedale') || desc.includes('clinica') || desc.includes('dentista') ||
      desc.includes('veterinario') || desc.includes('analisi') || desc.includes('medicina') ||
      desc.includes('farmaci')) {
    return 'Salute';
  }
  
  // Abbigliamento e shopping
  if (desc.includes('abbigliamento') || desc.includes('clothing') || desc.includes('zara') || 
      desc.includes('h&m') || desc.includes('decathlon') || desc.includes('ovs') || desc.includes('coin')) {
    return 'Abbigliamento';
  }
  if (desc.includes('shopping') || desc.includes('amazon') || desc.includes('ebay') ||
      desc.includes('mediaworld') || desc.includes('unieuro') || desc.includes('ikea')) {
    return 'Shopping';
  }
  
  // Intrattenimento e abbonamenti
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('entertainment') || 
      desc.includes('cinema') || desc.includes('teatro') || desc.includes('disney') || 
      desc.includes('amazon prime') || desc.includes('apple music') || desc.includes('youtube') ||
      desc.includes('playstation') || desc.includes('xbox') || desc.includes('steam')) {
    return 'Abbonamenti';
  }
  
  // Tasse e scuola
  if (desc.includes('tasse') || desc.includes('f24') || desc.includes('agenzia entrate') ||
      desc.includes('imu') || desc.includes('tari') || desc.includes('bollo auto') ||
      desc.includes('multa') || desc.includes('sanzione')) {
    return 'Tasse';
  }
  if (desc.includes('scuola') || desc.includes('universit') || desc.includes('istruzione') ||
      desc.includes('roma capitale')) {
    return 'Scuola';
  }
  
  // Tabacchi
  if (desc.includes('tabacchi') || desc.includes('tabaccheria')) {
    return 'Tabacchi';
  }
  
  
  return 'Altro';
}