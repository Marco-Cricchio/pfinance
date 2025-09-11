import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@/types/transaction';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'File PDF richiesto' }, { status: 400 });
    }

    // Temporarily return error - PDF parsing not implemented yet
    return NextResponse.json({ 
      error: 'Il parsing dei file PDF non è ancora implementato. Si prega di utilizzare file CSV o Excel.' 
    }, { status: 400 });

    // TODO: Implement PDF parsing when pdfjs-dist is properly configured
    
    const lines = text.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      // Regex più robusta per trovare importi e date
      const amountMatches = line.match(/[-+]?\d{1,3}(?:[.,]\d{3})*[.,]?\d{0,2}/g);
      const dateMatches = line.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g);
      
      if (amountMatches && dateMatches && amountMatches.length > 0) {
        const amountStr = amountMatches[amountMatches.length - 1];
        const amount = parseFloat(amountStr.replace(/[,\.]/g, match => match === ',' ? '.' : match).replace(/[^\d.-]/g, ''));
        
        if (!isNaN(amount) && Math.abs(amount) > 0.01) {
          const date = formatDate(dateMatches[0]);
          const description = extractDescription(line, dateMatches[0], amountStr);
          const uniqueId = `pdf-${date}-${Math.abs(amount)}-${description.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}-${index}`;
          
          const transaction: Transaction = {
            id: uniqueId,
            date: date,
            amount: Math.abs(amount),
            description: description,
            category: categorizeTransaction(line),
            type: amount >= 0 ? 'income' : 'expense',
          };
          
          transactions.push(transaction);
          
          if (transaction.type === 'income') {
            totalIncome += transaction.amount;
          } else {
            totalExpenses += transaction.amount;
          }
        }
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
    console.error('Errore parsing PDF:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'elaborazione del PDF' }, 
      { status: 500 }
    );
  }
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [day, month, year] = parts;
    
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

function extractDescription(line: string, dateStr: string, amountStr: string): string {
  let cleanLine = line
    .replace(new RegExp(dateStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .replace(new RegExp(amountStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Rimuove codici comuni delle banche
  cleanLine = cleanLine
    .replace(/^[\d\s-]+/, '')
    .replace(/\b(POS|ATM|BANCOMAT|TRN|REF|CRO)[\s\d]*\b/gi, '')
    .trim();
  
  return cleanLine || 'Transazione PDF';
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  // Specific merchant mappings
  if (desc.includes('younited') || desc.includes('paga in 3 rate')) {
    return 'Rateizzazioni';
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
  
  // Generic category mappings
  if (desc.includes('stipendio') || desc.includes('salary') || desc.includes('bonifico in entrata')) {
    return 'Stipendio';
  }
  if (desc.includes('supermercato') || desc.includes('alimentari') || desc.includes('grocery') || 
      desc.includes('conad') || desc.includes('coop') || desc.includes('esselunga')) {
    return 'Alimenti';
  }
  if (desc.includes('benzina') || desc.includes('carburante') || desc.includes('fuel') || 
      desc.includes('eni') || desc.includes('agip') || desc.includes('q8')) {
    return 'Trasporti';
  }
  if (desc.includes('ristorante') || desc.includes('bar') || desc.includes('restaurant') || 
      desc.includes('pizzeria') || desc.includes('trattoria')) {
    return 'Ristorazione';
  }
  if (desc.includes('affitto') || desc.includes('rent') || desc.includes('mutuo') || 
      desc.includes('canone')) {
    return 'Casa';
  }
  if (desc.includes('utenze') || desc.includes('luce') || desc.includes('gas') || 
      desc.includes('enel') || desc.includes('eni plenitude') || desc.includes('utilities')) {
    return 'Utenze';
  }
  if (desc.includes('trasporti') || desc.includes('autobus') || desc.includes('metro') || 
      desc.includes('trenitalia') || desc.includes('atac') || desc.includes('transport')) {
    return 'Trasporti';
  }
  if (desc.includes('medico') || desc.includes('farmacia') || desc.includes('health') || 
      desc.includes('ospedale') || desc.includes('clinica')) {
    return 'Salute';
  }
  if (desc.includes('shopping') || desc.includes('abbigliamento') || desc.includes('clothing') || 
      desc.includes('zara') || desc.includes('h&m')) {
    return 'Abbigliamento';
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('entertainment') || 
      desc.includes('cinema') || desc.includes('teatro')) {
    return 'Svago';
  }
  
  return 'Altro';
}