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
    
    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON ai_chat_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON ai_chat_sessions(last_activity DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON ai_chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON ai_chat_messages(created_at DESC);
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
      db.exec('ALTER TABLE transactions ADD COLUMN manual_category_id INTEGER');
    }
    
    if (!hasIsManualOverride) {
      db.exec('ALTER TABLE transactions ADD COLUMN is_manual_override BOOLEAN DEFAULT 0');
    }
    
    if (!hasCreatedAt) {
      db.exec('ALTER TABLE transactions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
    
    if (!hasUpdatedAt) {
      db.exec('ALTER TABLE transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    }
    
    // Enhanced balance management migration
    const balanceTableInfo = db.prepare("PRAGMA table_info(account_balance)").all() as Array<{name: string}>;
    const hasBalanceDate = balanceTableInfo.some(col => col.name === 'balance_date');
    const hasFileSource = balanceTableInfo.some(col => col.name === 'file_source');
    const hasBalanceManualOverride = balanceTableInfo.some(col => col.name === 'is_manual_override');
    
    if (!hasBalanceDate) {
      db.exec('ALTER TABLE account_balance ADD COLUMN balance_date DATE');
    }
    
    if (!hasFileSource) {
      db.exec('ALTER TABLE account_balance ADD COLUMN file_source TEXT');
    }
    
    if (!hasBalanceManualOverride) {
      db.exec('ALTER TABLE account_balance ADD COLUMN is_manual_override BOOLEAN DEFAULT 0');
    }
    
    // Create file_balances table for storing balance history from files
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        balance REAL NOT NULL,
        balance_date DATE,
        file_type TEXT NOT NULL, -- 'pdf' or 'xlsx'
        extraction_pattern TEXT, -- which pattern was used to extract balance
        is_selected BOOLEAN DEFAULT 0, -- which balance is currently active
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create balance_audit_log table for tracking manual changes
    db.exec(`
    CREATE TABLE IF NOT EXISTS balance_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_balance REAL,
      new_balance REAL,
      change_reason TEXT, -- 'file_import', 'manual_override', 'calculation_correction'
      changed_by TEXT DEFAULT 'system',
      file_source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- System initialization tracking table
    CREATE TABLE IF NOT EXISTS system_initialization (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      categories_initialized BOOLEAN DEFAULT 0,
      initialization_version TEXT DEFAULT '1.0',
      first_initialized_at DATETIME,
      last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      initialization_count INTEGER DEFAULT 0
    );
    
    -- Insert default record if not exists
    INSERT OR IGNORE INTO system_initialization (id) VALUES (1);
    `);
    
    // Keep initial balance at €1000.00 (no forced update)
    const currentBalance = db.prepare('SELECT balance FROM account_balance WHERE id = 1').get() as { balance: number } | undefined;
    if (currentBalance && currentBalance.balance === 1000.0) {
      // Just set the file_source for tracking purposes, but keep balance at 1000.00
      db.exec(`
        UPDATE account_balance 
        SET file_source = 'initial_setup', 
            is_manual_override = 0,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `);
      
      // Log this change
      db.exec(`
        INSERT INTO balance_audit_log (old_balance, new_balance, change_reason, file_source)
        VALUES (NULL, 1000.0, 'initial_setup', 'initial_setup')
      `);
    }
    
    
    // Create missing indexes after migration
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_manual_category ON transactions(manual_category_id);
      CREATE INDEX IF NOT EXISTS idx_file_balances_filename ON file_balances(filename);
      CREATE INDEX IF NOT EXISTS idx_file_balances_date ON file_balances(balance_date DESC);
      CREATE INDEX IF NOT EXISTS idx_file_balances_selected ON file_balances(is_selected);
      CREATE INDEX IF NOT EXISTS idx_balance_audit_created ON balance_audit_log(created_at DESC);
    `);
    
  } catch (migrationError) {
    console.warn('⚠️ Migration warning:', migrationError);
  }
  
  
  // Initialize default categories and rules with robust error handling
  // Immediate execution with safety checks
  import('./categorizer')
    .then(({ initializeDefaultCategories }) => {
      // Additional safety check before calling
      const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
      const initStatus = db.prepare(`
        SELECT categories_initialized FROM system_initialization WHERE id = 1
      `).get() as { categories_initialized: number } | undefined;
      
      // Only initialize if not already done
      if (!initStatus?.categories_initialized && existingCategories.count === 0) {
        console.warn('ℹ️ Starting categories initialization...');
        initializeDefaultCategories();
      } else {
        console.warn('✓ Categories already initialized, skipping...');
      }
    })
    .catch(error => {
      console.error('❌ Error during categories initialization:', error);
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
      SELECT 
        t.id, t.date, t.amount, t.description, t.category, t.type, 
        t.manual_category_id, t.is_manual_override,
        COALESCE(c.name, t.category) as resolved_category
      FROM transactions t
      LEFT JOIN categories c ON t.manual_category_id = c.id
      ORDER BY t.date DESC
    `);
    
    const results = stmt.all() as any[];
    
    // Map results to use resolved_category as the main category when manual override exists
    return results.map(row => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.is_manual_override ? row.resolved_category : row.category,
      type: row.type,
      manual_category_id: row.manual_category_id,
      is_manual_override: row.is_manual_override
    })) as Transaction[];
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

export function getCategoryByName(name: string): any | null {
  try {
    const stmt = db.prepare('SELECT * FROM categories WHERE name = ? AND is_active = 1');
    return stmt.get(name) || null;
  } catch (error) {
    console.error('Error fetching category by name:', error);
    return null;
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

export function createOrGetCategory(name: string, type: string = 'both', color: string = '#8884d8'): number | null {
  try {
    // First, check if category already exists
    const existing = getCategoryByName(name);
    if (existing) {
      return existing.id;
    }
    
    // If not exists, create it
    return createCategory(name, type, color);
  } catch (error) {
    console.error('Error creating or getting category:', error);
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

export function getCategoryRuleByPatternAndCategory(categoryId: number, pattern: string, matchType: string = 'contains'): any | null {
  try {
    const stmt = db.prepare('SELECT * FROM category_rules WHERE category_id = ? AND pattern = ? AND match_type = ? AND enabled = 1');
    return stmt.get(categoryId, pattern, matchType) || null;
  } catch (error) {
    console.error('Error fetching category rule by pattern:', error);
    return null;
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

export function createOrGetCategoryRule(categoryId: number, pattern: string, matchType: string = 'contains', priority: number = 0): number | null {
  try {
    // First, check if rule already exists
    const existing = getCategoryRuleByPatternAndCategory(categoryId, pattern, matchType);
    if (existing) {
      return existing.id;
    }
    
    // If not exists, create it
    return createCategoryRule(categoryId, pattern, matchType, priority);
  } catch (error) {
    console.error('Error creating or getting category rule:', error);
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

// ============================================================================
// BALANCE MANAGEMENT FUNCTIONS
// ============================================================================

export interface FileBalance {
  id: number;
  filename: string;
  balance: number;
  balance_date?: string;
  file_type: 'pdf' | 'xlsx';
  extraction_pattern?: string;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

export interface BalanceAuditLog {
  id: number;
  old_balance?: number;
  new_balance: number;
  change_reason: string;
  changed_by: string;
  file_source?: string;
  created_at: string;
}

// Save balance from file import
export function saveFileBalance(
  filename: string, 
  balance: number, 
  fileType: 'pdf' | 'xlsx', 
  balanceDate?: string,
  extractionPattern?: string
): number | null {
  try {
    // Check if file balance already exists
    const existing = db.prepare(
      'SELECT id FROM file_balances WHERE filename = ?'
    ).get(filename) as { id: number } | undefined;
    
    if (existing) {
      // Update existing
      const stmt = db.prepare(`
        UPDATE file_balances 
        SET balance = ?, balance_date = ?, extraction_pattern = ?, updated_at = CURRENT_TIMESTAMP
        WHERE filename = ?
      `);
      stmt.run(balance, balanceDate, extractionPattern, filename);
      return existing.id;
    } else {
      // Insert new
      const stmt = db.prepare(`
        INSERT INTO file_balances (filename, balance, balance_date, file_type, extraction_pattern)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(filename, balance, balanceDate, fileType, extractionPattern);
      return result.lastInsertRowid as number;
    }
  } catch (error) {
    console.error('Error saving file balance:', error);
    return null;
  }
}

// Get all file balances
export function getAllFileBalances(): FileBalance[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM file_balances 
      ORDER BY balance_date DESC, created_at DESC
    `);
    return stmt.all() as FileBalance[];
  } catch (error) {
    console.error('Error fetching file balances:', error);
    return [];
  }
}

// Set active balance from file
export function setActiveFileBalance(fileBalanceId: number): boolean {
  try {
    const transaction = db.transaction(() => {
      // Get the selected balance
      const selectedBalance = db.prepare(
        'SELECT * FROM file_balances WHERE id = ?'
      ).get(fileBalanceId) as FileBalance | undefined;
      
      if (!selectedBalance) {
        throw new Error('File balance not found');
      }
      
      // Get current balance for audit
      const currentBalance = getAccountBalance();
      
      // Unselect all other balances
      db.prepare('UPDATE file_balances SET is_selected = 0').run();
      
      // Select the chosen balance
      db.prepare('UPDATE file_balances SET is_selected = 1 WHERE id = ?').run(fileBalanceId);
      
      // Update account balance
      db.prepare(`
        UPDATE account_balance 
        SET balance = ?, 
            balance_date = ?, 
            file_source = ?,
            is_manual_override = 0,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `).run(selectedBalance.balance, selectedBalance.balance_date, selectedBalance.filename);
      
      // Log the change
      db.prepare(`
        INSERT INTO balance_audit_log (old_balance, new_balance, change_reason, file_source)
        VALUES (?, ?, ?, ?)
      `).run(currentBalance, selectedBalance.balance, 'file_selection', selectedBalance.filename);
      
    });
    
    transaction();
    return true;
  } catch (error) {
    console.error('Error setting active file balance:', error);
    return false;
  }
}

// Manual balance override
export function setManualBalance(newBalance: number, reason: string = 'manual_override'): boolean {
  try {
    const currentBalance = getAccountBalance();
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().slice(0, 10);
    
    const stmt = db.prepare(`
      UPDATE account_balance 
      SET balance = ?, 
          balance_date = ?,
          is_manual_override = 1,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `);
    
    const result = stmt.run(newBalance, today);
    
    // Log the change
    db.prepare(`
      INSERT INTO balance_audit_log (old_balance, new_balance, change_reason, changed_by)
      VALUES (?, ?, ?, ?)
    `).run(currentBalance, newBalance, reason, 'user');
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error setting manual balance:', error);
    return false;
  }
}

// Get balance audit log
export function getBalanceAuditLog(limit: number = 50): BalanceAuditLog[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM balance_audit_log 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as BalanceAuditLog[];
  } catch (error) {
    console.error('Error fetching balance audit log:', error);
    return [];
  }
}

// Calculate current balance with validation
export function calculateCurrentBalance(): {
  calculatedBalance: number;
  baseBalance: number;
  baseDate?: string;
  fileSource?: string;
  difference: number;
  isWithinThreshold: boolean;
} {
  try {
    // Get base balance info including manual override flag
    const baseInfo = db.prepare(
      'SELECT balance, balance_date, file_source, is_manual_override FROM account_balance WHERE id = 1'
    ).get() as { balance: number; balance_date?: string; file_source?: string; is_manual_override: boolean } | undefined;
    
    if (!baseInfo) {
      throw new Error('No base balance found');
    }
    
    // If no base date, calculate from all transactions (legacy behavior)
    if (!baseInfo.balance_date) {
      const calculated = calculateAccountBalance();
      return {
        calculatedBalance: calculated,
        baseBalance: baseInfo.balance,
        difference: calculated - baseInfo.balance,
        isWithinThreshold: Math.abs(calculated - baseInfo.balance) <= 50.0
      };
    }
    
    // NEW LOGIC: For manual overrides with date, calculate from that date forward
    if (baseInfo.is_manual_override) {
      // Get transactions strictly after the balance_date
      const transactions = db.prepare(`
        SELECT amount, type FROM transactions 
        WHERE date > ? 
        ORDER BY date ASC
      `).all(baseInfo.balance_date) as { amount: number; type: string }[];
      
      // If no transactions after the override date, no discrepancy
      if (transactions.length === 0) {
        return {
          calculatedBalance: baseInfo.balance,
          baseBalance: baseInfo.balance,
          baseDate: baseInfo.balance_date,
          fileSource: baseInfo.file_source,
          difference: 0,
          isWithinThreshold: true
        };
      }
      
      // Calculate incremental balance: Saldo Finale = Saldo Iniziale + ∑(Entrate) - ∑(Uscite)
      let calculatedBalance = baseInfo.balance;
      for (const transaction of transactions) {
        if (transaction.type === 'income') {
          calculatedBalance += Math.abs(transaction.amount);
        } else if (transaction.type === 'expense') {
          calculatedBalance -= Math.abs(transaction.amount);
        }
      }
      
      return {
        calculatedBalance,
        baseBalance: baseInfo.balance,
        baseDate: baseInfo.balance_date,
        fileSource: baseInfo.file_source,
        difference: calculatedBalance - baseInfo.balance,
        isWithinThreshold: Math.abs(calculatedBalance - baseInfo.balance) <= 50.0
      };
    }
    
    // LEGACY LOGIC: For file-based balances (not manual overrides)
    // Get transactions after base date
    const transactions = db.prepare(`
      SELECT amount, type FROM transactions 
      WHERE date > ? 
      ORDER BY date ASC
    `).all(baseInfo.balance_date) as { amount: number; type: string }[];
    
    // Calculate incremental balance
    let calculatedBalance = baseInfo.balance;
    for (const transaction of transactions) {
      if (transaction.type === 'income') {
        calculatedBalance += Math.abs(transaction.amount);
      } else if (transaction.type === 'expense') {
        calculatedBalance -= Math.abs(transaction.amount);
      }
    }
    
    return {
      calculatedBalance,
      baseBalance: baseInfo.balance,
      baseDate: baseInfo.balance_date,
      fileSource: baseInfo.file_source,
      difference: calculatedBalance - baseInfo.balance,
      isWithinThreshold: Math.abs(calculatedBalance - baseInfo.balance) <= 50.0
    };
  } catch (error) {
    console.error('Error calculating current balance:', error);
    return {
      calculatedBalance: 0,
      baseBalance: 0,
      difference: 0,
      isWithinThreshold: false
    };
  }
}

// Chat management functions
export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  last_activity: string;
}

// Generate a unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create default chat session for a user
export function getOrCreateChatSession(userId: string = 'default_user'): ChatSession {
  try {
    // Try to get the most recent session for the user
    const existingSession = db.prepare(`
      SELECT * FROM ai_chat_sessions 
      WHERE user_id = ? 
      ORDER BY last_activity DESC 
      LIMIT 1
    `).get(userId) as ChatSession | undefined;
    
    if (existingSession) {
      return existingSession;
    }
    
    // Create a new session if none exists
    const sessionId = generateSessionId();
    const stmt = db.prepare(`
      INSERT INTO ai_chat_sessions (id, user_id, title)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(sessionId, userId, 'Nuova Conversazione');
    
    // Return the newly created session
    return {
      id: sessionId,
      user_id: userId,
      title: 'Nuova Conversazione',
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting or creating chat session:', error);
    // Return a fallback session
    return {
      id: 'fallback_session',
      user_id: userId,
      title: 'Conversazione Fallback',
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };
  }
}

// Insert a new chat message
export function insertChatMessage(
  sessionId: string, 
  role: 'user' | 'assistant' | 'system', 
  content: string
): number | null {
  try {
    const stmt = db.prepare(`
      INSERT INTO ai_chat_messages (session_id, role, content)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(sessionId, role, content);
    
    // Update session's last activity
    const updateSession = db.prepare(`
      UPDATE ai_chat_sessions 
      SET last_activity = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    updateSession.run(sessionId);
    
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error inserting chat message:', error);
    return null;
  }
}

// Get chat messages for a session
export function getChatMessages(
  sessionId: string, 
  limit: number = 50
): ChatMessage[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM ai_chat_messages 
      WHERE session_id = ? 
      ORDER BY created_at ASC 
      LIMIT ?
    `);
    
    return stmt.all(sessionId, limit) as ChatMessage[];
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return [];
  }
}

// Get conversation history for a user (all messages from latest session)
export function getConversationHistory(userId: string = 'default_user'): ChatMessage[] {
  try {
    const session = getOrCreateChatSession(userId);
    return getChatMessages(session.id);
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

// Clear all messages from a session (for reset functionality)
export function clearChatSession(sessionId: string): boolean {
  try {
    const stmt = db.prepare('DELETE FROM ai_chat_messages WHERE session_id = ?');
    const result = stmt.run(sessionId);
    
    // Update session activity
    const updateSession = db.prepare(`
      UPDATE ai_chat_sessions 
      SET last_activity = CURRENT_TIMESTAMP, title = 'Nuova Conversazione' 
      WHERE id = ?
    `);
    updateSession.run(sessionId);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error clearing chat session:', error);
    return false;
  }
}

// ============================================================================
// BALANCE RESET FUNCTIONS
// ============================================================================

export interface BalanceResetResult {
  fileBalancesDeleted: number;
  auditLogEntriesDeleted: number;
  accountBalanceReset: boolean;
  oldBalance: number;
  newBalance: number;
}

// Complete reset of all balance-related data
export function resetAllBalances(): BalanceResetResult {
  try {
    const transaction = db.transaction(() => {
      // Count records before deletion for reporting
      const fileBalancesCount = db.prepare('SELECT COUNT(*) as count FROM file_balances').get() as { count: number };
      const auditLogCount = db.prepare('SELECT COUNT(*) as count FROM balance_audit_log').get() as { count: number };
      
      // Get the old balance BEFORE resetting it
      const currentBalanceInfo = db.prepare('SELECT balance FROM account_balance WHERE id = 1').get() as { balance: number } | undefined;
      const oldBalance = currentBalanceInfo?.balance || 0;
      
      // Clear all file balances (removes all file-based balance history)
      db.prepare('DELETE FROM file_balances').run();
      
      // Clear all balance audit log (removes all historical changes)
      db.prepare('DELETE FROM balance_audit_log').run();
      
      // Reset the main account balance to 0.00 and clear all references
      const resetAccountBalance = db.prepare(`
        UPDATE account_balance 
        SET balance = 0.00, 
            balance_date = NULL, 
            file_source = NULL,
            is_manual_override = 0,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `);
      const balanceResetResult = resetAccountBalance.run();
      
      // Insert initial audit log entry for the reset operation (after clearing old audit log)
      db.prepare(`
        INSERT INTO balance_audit_log (old_balance, new_balance, change_reason, changed_by)
        VALUES (?, 0.00, 'complete_reset', 'user')
      `).run(oldBalance);
      
      return {
        fileBalancesDeleted: fileBalancesCount.count,
        auditLogEntriesDeleted: auditLogCount.count,
        accountBalanceReset: balanceResetResult.changes > 0,
        oldBalance: oldBalance,
        newBalance: 0.00
      };
    });
    
    return transaction();
  } catch (error) {
    console.error('Error resetting all balances:', error);
    throw error;
  }
}

// Initialize welcome message for new users
export function initializeWelcomeMessage(sessionId: string): void {
  try {
    // Check if session already has messages
    const existingMessages = getChatMessages(sessionId, 1);
    if (existingMessages.length > 0) {
      return; // Session already has messages, don't add welcome
    }
    
    const welcomeMessage = `Ciao! Sono il tuo consulente finanziario personale AI. 🤖💰

Ho accesso ai tuoi dati finanziari e posso aiutarti con:

• Analisi delle tue spese e entrate
• Suggerimenti per ottimizzare il budget
• Identificazione di pattern di spesa
• Consigli personalizzati per il risparmio
• Risposte a domande specifiche sui tuoi movimenti

Come posso aiutarti oggi? Puoi farmi qualsiasi domanda sui tuoi dati finanziari!`;
    
    insertChatMessage(sessionId, 'assistant', welcomeMessage);
  } catch (error) {
    console.error('Error initializing welcome message:', error);
  }
}

export { db };
