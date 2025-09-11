import Papa from 'papaparse';
import { Transaction, ParsedData } from '@/types/transaction';

export function parseCSV(content: string): ParsedData {
  const parseResult = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const transactions: Transaction[] = [];
  let totalIncome = 0;
  let totalExpenses = 0;

  parseResult.data.forEach((row: any, index: number) => {
    try {
      const amount = parseFloat(String(row.amount || row.Amount || row.Importo || 0).replace(/[€,]/g, ''));
      
      if (isNaN(amount)) return;

      const date = row.date || row.Date || row.Data || new Date().toISOString().split('T')[0];
      const description = row.description || row.Description || row.Descrizione || 'Transazione';
      const uniqueId = `csv-${date}-${Math.abs(amount)}-${description.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}-${index}`;
      
      const transaction: Transaction = {
        id: uniqueId,
        date: date,
        amount: Math.abs(amount),
        description: description,
        category: categorizeTransaction(description),
        type: amount >= 0 ? 'income' : 'expense',
        balance: parseFloat(String(row.balance || row.Balance || row.Saldo || 0).replace(/[€,]/g, '')) || undefined,
      };

      transactions.push(transaction);

      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }
    } catch (error) {
      console.warn(`Errore parsing riga ${index}:`, error);
    }
  });

  return {
    transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    totalIncome,
    totalExpenses,
    netFlow: totalIncome - totalExpenses,
  };
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
  if (desc.includes('supermercato') || desc.includes('alimentari') || desc.includes('grocery')) {
    return 'Alimenti';
  }
  if (desc.includes('benzina') || desc.includes('carburante') || desc.includes('fuel')) {
    return 'Trasporti';
  }
  if (desc.includes('ristorante') || desc.includes('bar') || desc.includes('restaurant')) {
    return 'Ristorazione';
  }
  if (desc.includes('affitto') || desc.includes('rent') || desc.includes('mutuo')) {
    return 'Casa';
  }
  if (desc.includes('utenze') || desc.includes('luce') || desc.includes('gas') || desc.includes('utilities')) {
    return 'Utenze';
  }
  if (desc.includes('trasporti') || desc.includes('autobus') || desc.includes('metro') || desc.includes('transport')) {
    return 'Trasporti';
  }
  if (desc.includes('medico') || desc.includes('farmacia') || desc.includes('health')) {
    return 'Salute';
  }
  if (desc.includes('shopping') || desc.includes('abbigliamento') || desc.includes('clothing')) {
    return 'Abbigliamento';
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('entertainment')) {
    return 'Svago';
  }
  
  return 'Altro';
}

