import Papa from 'papaparse';
import { Transaction, ParsedData } from '@/types/transaction';

// Simple fallback categorization for client-side
function categorizeTransactionFallback(transaction: Transaction): string {
  const desc = transaction.description.toLowerCase();
  
  // Basic categorization without database
  if (desc.includes('supermercato') || desc.includes('alimentari')) return 'Alimenti';
  if (desc.includes('benzina') || desc.includes('carburante')) return 'Trasporti';
  if (desc.includes('ristorante') || desc.includes('pizzeria')) return 'Ristorazione';
  if (desc.includes('farmacia') || desc.includes('medico')) return 'Salute';
  if (desc.includes('stipendio') || desc.includes('salary')) return 'Stipendio';
  
  return 'Altro';
}

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
        category: categorizeTransactionFallback({
          id: uniqueId,
          date,
          amount: Math.abs(amount),
          description,
          type: amount >= 0 ? 'income' : 'expense',
          is_manual_override: false,
          manual_category_id: null
        } as Transaction),
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

// Categorization logic moved to centralized categorizer engine

