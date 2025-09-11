import Database from 'better-sqlite3';
import { Transaction, ParsedData } from '@/types/transaction';
import path from 'path';

// Inizializza il database
const dbPath = path.join(process.cwd(), 'data', 'pfinance.db');
let db: Database.Database;

// Assicurati che la directory data esista
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

try {
  db = new Database(dbPath);
  
  // Crea le tabelle se non esistono
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      hash TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS account_balance (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      balance REAL NOT NULL DEFAULT 1000.00,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Insert default balance if not exists
    INSERT OR IGNORE INTO account_balance (id, balance) VALUES (1, 1000.00);
    
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(hash);
  `);
  
  console.log('✅ Database SQLite inizializzato correttamente');
} catch (error) {
  console.error('❌ Errore inizializzazione database:', error);
}

// Funzione per generare un hash unico per ogni transazione
function generateTransactionHash(transaction: Omit<Transaction, 'id'>): string {
  // Normalizza la descrizione rimuovendo spazi extra e caratteri speciali per un confronto più preciso
  const normalizedDescription = transaction.description.trim().toLowerCase().replace(/\s+/g, ' ');
  const hashString = `${transaction.date}-${transaction.amount.toFixed(2)}-${normalizedDescription}-${transaction.type}`;
  
  // Semplice hash function
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converte in 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Inserisce o aggiorna una transazione (evita duplicati)
export function insertTransaction(transaction: Transaction): boolean {
  const hash = generateTransactionHash(transaction);
  
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO transactions (id, date, amount, description, category, type, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      transaction.id,
      transaction.date,
      transaction.amount,
      transaction.description,
      transaction.category,
      transaction.type,
      hash
    );
    
    return result.changes > 0;
  } catch (error) {
    console.error('Errore inserimento transazione:', error);
    return false;
  }
}

// Inserisce multiple transazioni evitando duplicati
export function insertTransactions(transactions: Transaction[]): { inserted: number, duplicates: number } {
  let inserted = 0;
  let duplicates = 0;
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO transactions (id, date, amount, description, category, type, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction((transactions: Transaction[]) => {
    for (const trans of transactions) {
      const hash = generateTransactionHash(trans);
      const result = insertStmt.run(
        trans.id,
        trans.date,
        trans.amount,
        trans.description,
        trans.category,
        trans.type,
        hash
      );
      
      if (result.changes > 0) {
        inserted++;
      } else {
        duplicates++;
      }
    }
  });
  
  try {
    transaction(transactions);
    console.log(`✅ Inserite ${inserted} nuove transazioni, ${duplicates} duplicati ignorati`);
    return { inserted, duplicates };
  } catch (error) {
    console.error('Errore inserimento batch transazioni:', error);
    return { inserted: 0, duplicates: 0 };
  }
}

// Recupera tutte le transazioni
export function getAllTransactions(): Transaction[] {
  try {
    const stmt = db.prepare(`
      SELECT id, date, amount, description, category, type
      FROM transactions
      ORDER BY date DESC
    `);
    
    return stmt.all() as Transaction[];
  } catch (error) {
    console.error('Errore recupero transazioni:', error);
    return [];
  }
}

// Genera ParsedData da tutte le transazioni nel database
export function getParsedData(): ParsedData {
  const transactions = getAllTransactions();
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return {
    transactions,
    totalIncome,
    totalExpenses,
    netFlow: totalIncome - totalExpenses
  };
}

// Elimina tutte le transazioni (per reset completo)
export function clearAllTransactions(): void {
  try {
    db.exec('DELETE FROM transactions');
    console.log('✅ Tutte le transazioni sono state eliminate');
  } catch (error) {
    console.error('Errore eliminazione transazioni:', error);
  }
}

// Statistiche database
export function getDatabaseStats() {
  try {
    const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
    const totalIncome = db.prepare('SELECT SUM(amount) as sum FROM transactions WHERE type = ?').get('income') as { sum: number | null };
    const totalExpenses = db.prepare('SELECT SUM(amount) as sum FROM transactions WHERE type = ?').get('expense') as { sum: number | null };
    
    return {
      totalTransactions: totalTransactions.count,
      totalIncome: totalIncome.sum || 0,
      totalExpenses: totalExpenses.sum || 0,
      netFlow: (totalIncome.sum || 0) - (totalExpenses.sum || 0)
    };
  } catch (error) {
    console.error('Errore statistiche database:', error);
    return {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netFlow: 0
    };
  }
}

// Riaggiorna la categorizzazione di tutte le transazioni esistenti
export function recategorizeAllTransactions(categorizeFunction: (description: string) => string): number {
  try {
    const selectStmt = db.prepare('SELECT id, description FROM transactions');
    const updateStmt = db.prepare('UPDATE transactions SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    
    const transactions = selectStmt.all() as { id: string, description: string }[];
    let updated = 0;
    
    const transaction = db.transaction(() => {
      for (const trans of transactions) {
        const newCategory = categorizeFunction(trans.description);
        const result = updateStmt.run(newCategory, trans.id);
        if (result.changes > 0) {
          updated++;
        }
      }
    });
    
    transaction();
    console.log(`✅ Ricategorizzate ${updated} transazioni`);
    return updated;
  } catch (error) {
    console.error('Errore ricategorizzazione transazioni:', error);
    return 0;
  }
}

// Funzioni per gestire il saldo contabile
export function getAccountBalance(): number {
  try {
    const result = db.prepare('SELECT balance FROM account_balance WHERE id = 1').get() as { balance: number } | undefined;
    return result?.balance || 1000.00;
  } catch (error) {
    console.error('Errore recupero saldo contabile:', error);
    return 1000.00;
  }
}

export function updateAccountBalance(newBalance: number): void {
  try {
    const stmt = db.prepare('UPDATE account_balance SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1');
    stmt.run(newBalance);
    console.log(`✅ Saldo contabile aggiornato a €${newBalance.toFixed(2)}`);
  } catch (error) {
    console.error('Errore aggiornamento saldo contabile:', error);
  }
}

export function calculateAccountBalance(): number {
  try {
    const transactions = getAllTransactions();
    
    if (transactions.length === 0) {
      return 1000.00; // Saldo iniziale quando non ci sono transazioni
    }
    
    let currentBalance = 1000.00; // Saldo iniziale
    
    // Ordina le transazioni per data valuta
    const sortedTransactions = transactions.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Calcola il saldo applicando le transazioni in ordine cronologico
    for (const transaction of sortedTransactions) {
      if (transaction.type === 'income') {
        currentBalance += Math.abs(transaction.amount);
      } else if (transaction.type === 'expense') {
        currentBalance -= Math.abs(transaction.amount);
      }
    }
    
    return currentBalance;
  } catch (error) {
    console.error('Errore calcolo saldo contabile:', error);
    return 1000.00;
  }
}

export { db };