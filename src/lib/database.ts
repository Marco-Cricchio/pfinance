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
      manual_category_id INTEGER,
      is_manual_override BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manual_category_id) REFERENCES categories(id)
    );
    
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT CHECK (type IN ('income', 'expense', 'both')) DEFAULT 'both',
      color TEXT DEFAULT '#8884d8',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      pattern TEXT NOT NULL,
      match_type TEXT CHECK (match_type IN ('contains', 'startsWith', 'endsWith')) DEFAULT 'contains',
      priority INTEGER DEFAULT 0,
      enabled BOOLEAN DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
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
    CREATE INDEX IF NOT EXISTS idx_transactions_manual_category ON transactions(manual_category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
    CREATE INDEX IF NOT EXISTS idx_category_rules_priority ON category_rules(priority, enabled);
    CREATE INDEX IF NOT EXISTS idx_category_rules_category ON category_rules(category_id);
  `);
  
  // Migration logic for existing databases
  try {
    // Check if manual_category_id column exists, if not add it
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all() as Array<{name: string}>;
    const hasManualCategoryId = tableInfo.some(col => col.name === 'manual_category_id');
    const hasIsManualOverride = tableInfo.some(col => col.name === 'is_manual_override');
    const hasCreatedAt = tableInfo.some(col => col.name === 'created_at');
    const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
    
    if (!hasManualCategoryId) {
      console.log('🔧 Adding manual_category_id column...');
      db.exec('ALTER TABLE transactions ADD COLUMN manual_category_id INTEGER');
    }
    
    if (!hasIsManualOverride) {
      console.log('🔧 Adding is_manual_override column...');
      db.exec('ALTER TABLE transactions ADD COLUMN is_manual_override BOOLEAN DEFAULT 0');
    }
    
    if (!hasCreatedAt) {
      console.log('🔧 Adding created_at column...');
      db.exec('ALTER TABLE transactions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
    
    if (!hasUpdatedAt) {
      console.log('🔧 Adding updated_at column...');
      db.exec('ALTER TABLE transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
    
    console.log('✅ Database migration completed successfully');
    
    // Create missing indexes after migration
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_manual_category ON transactions(manual_category_id);
    `);
    
  } catch (migrationError) {
    console.warn('⚠️ Migration warning:', migrationError);
  }
  
  console.log('✅ Database SQLite inizializzato correttamente');
  
  // Initialize default categories and rules
  import('./categorizer').then(({ initializeDefaultCategories }) => {
    initializeDefaultCategories();
  }).catch(error => {
    console.error('Error importing categorizer:', error);
  });
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

// Category management functions
export function getAllCategories(): any[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM categories 
      WHERE is_active = 1 
      ORDER BY name ASC
    `);
    return stmt.all();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export function createCategory(name: string, type: string = 'both', color: string = '#8884d8'): number | null {
  try {
    const stmt = db.prepare(`
      INSERT INTO categories (name, type, color)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(name, type, color);
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error creating category:', error);
    return null;
  }
}

export function updateCategory(id: number, updates: { name?: string; type?: string; color?: string }): boolean {
  try {
    const fields = [];
    const values = [];
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.color) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE categories 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating category:', error);
    return false;
  }
}

export function deleteCategory(id: number): boolean {
  try {
    const stmt = db.prepare('UPDATE categories SET is_active = 0 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
}

// Category rules management
export function getAllCategoryRules(): any[] {
  try {
    const stmt = db.prepare(`
      SELECT 
        r.*,
        c.name as category_name,
        c.color as category_color
      FROM category_rules r
      JOIN categories c ON r.category_id = c.id
      ORDER BY r.priority ASC, r.id ASC
    `);
    return stmt.all();
  } catch (error) {
    console.error('Error fetching category rules:', error);
    return [];
  }
}

export function createCategoryRule(categoryId: number, pattern: string, matchType: string = 'contains', priority: number = 0): number | null {
  try {
    const stmt = db.prepare(`
      INSERT INTO category_rules (category_id, pattern, match_type, priority)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(categoryId, pattern, matchType, priority);
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error creating category rule:', error);
    return null;
  }
}

export function updateCategoryRule(id: number, updates: { pattern?: string; matchType?: string; priority?: number; enabled?: boolean }): boolean {
  try {
    const fields = [];
    const values = [];
    
    if (updates.pattern) {
      fields.push('pattern = ?');
      values.push(updates.pattern);
    }
    if (updates.matchType) {
      fields.push('match_type = ?');
      values.push(updates.matchType);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE category_rules 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);
    const result = stmt.run(...values);
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating category rule:', error);
    return false;
  }
}

export function deleteCategoryRule(id: number): boolean {
  try {
    const stmt = db.prepare('DELETE FROM category_rules WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting category rule:', error);
    return false;
  }
}

// Manual override functions
export function setManualCategory(transactionId: string, categoryId: number): boolean {
  try {
    const stmt = db.prepare(`
      UPDATE transactions 
      SET manual_category_id = ?, is_manual_override = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = stmt.run(categoryId, transactionId);
    return result.changes > 0;
  } catch (error) {
    console.error('Error setting manual category:', error);
    return false;
  }
}

export function removeManualCategory(transactionId: string): boolean {
  try {
    const stmt = db.prepare(`
      UPDATE transactions 
      SET manual_category_id = NULL, is_manual_override = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = stmt.run(transactionId);
    return result.changes > 0;
  } catch (error) {
    console.error('Error removing manual category:', error);
    return false;
  }
}

export { db };