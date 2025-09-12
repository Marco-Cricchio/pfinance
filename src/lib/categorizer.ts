import { Transaction } from '@/types/transaction';

// This module provides categorization functions
// Database operations are handled separately to avoid client-side imports

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense' | 'both';
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRule {
  id: number;
  category_id: number;
  pattern: string;
  match_type: 'contains' | 'startsWith' | 'endsWith';
  priority: number;
  enabled: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CategoryWithRule extends CategoryRule {
  category_name: string;
  category_color: string;
}

// Normalize description for consistent matching
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
}

// Apply a single rule to a description
function matchesRule(description: string, rule: CategoryRule): boolean {
  const normalizedDesc = normalizeDescription(description);
  const normalizedPattern = normalizeDescription(rule.pattern);
  
  switch (rule.match_type) {
    case 'contains':
      return normalizedDesc.includes(normalizedPattern);
    case 'startsWith':
      return normalizedDesc.startsWith(normalizedPattern);
    case 'endsWith':
      return normalizedDesc.endsWith(normalizedPattern);
    default:
      return false;
  }
}

// Get all active rules sorted by priority (server-side only)
function getActiveRules(): CategoryWithRule[] {
  // This function should only be called from server-side code
  if (typeof window !== 'undefined') {
    console.warn('getActiveRules called on client side');
    return [];
  }
  
  try {
    // Import database dynamically to avoid client-side bundle
    const { db } = require('./database');
    const stmt = db.prepare(`
      SELECT 
        r.*,
        c.name as category_name,
        c.color as category_color
      FROM category_rules r
      JOIN categories c ON r.category_id = c.id
      WHERE r.enabled = 1 AND c.is_active = 1
      ORDER BY r.priority ASC, LENGTH(r.pattern) DESC
    `);
    return stmt.all() as CategoryWithRule[];
  } catch (error) {
    console.error('Error fetching category rules:', error);
    return [];
  }
}

// Main categorization function (server-side only)
export function categorizeTransaction(transaction: Transaction): string {
  // If running on client side, return default
  if (typeof window !== 'undefined') {
    return 'Altro';
  }
  
  // 1. Check for manual override first
  if (transaction.is_manual_override && transaction.manual_category_id) {
    try {
      const { db } = require('./database');
      const stmt = db.prepare('SELECT name FROM categories WHERE id = ? AND is_active = 1');
      const category = stmt.get(transaction.manual_category_id) as { name: string } | undefined;
      if (category) {
        return category.name;
      }
    } catch (error) {
      console.error('Error fetching manual category:', error);
    }
  }
  
  // 2. Apply rules in priority order
  const rules = getActiveRules();
  for (const rule of rules) {
    if (matchesRule(transaction.description, rule)) {
      return rule.category_name;
    }
  }
  
  // 3. Fallback to default
  return 'Altro';
}

// Categorize multiple transactions efficiently (server-side only)
export function categorizeTransactions(transactions: Transaction[]): Transaction[] {
  // If running on client side, return transactions with default category
  if (typeof window !== 'undefined') {
    return transactions.map(t => ({ ...t, category: 'Altro' }));
  }
  
  const rules = getActiveRules();
  
  return transactions.map(transaction => {
    // Check manual override first
    if (transaction.is_manual_override && transaction.manual_category_id) {
      try {
        const { db } = require('./database');
        const stmt = db.prepare('SELECT name FROM categories WHERE id = ? AND is_active = 1');
        const category = stmt.get(transaction.manual_category_id) as { name: string } | undefined;
        if (category) {
          return { ...transaction, category: category.name };
        }
      } catch (error) {
        console.error('Error fetching manual category:', error);
      }
    }
    
    // Apply rules
    for (const rule of rules) {
      if (matchesRule(transaction.description, rule)) {
        return { ...transaction, category: rule.category_name };
      }
    }
    
    // Fallback
    return { ...transaction, category: 'Altro' };
  });
}

// Test categorization without applying (for preview) - server-side only
export function previewCategorization(descriptions: string[]): { description: string; category: string }[] {
  // If running on client side, return default categorization
  if (typeof window !== 'undefined') {
    return descriptions.map(description => ({ description, category: 'Altro' }));
  }
  
  const rules = getActiveRules();
  
  return descriptions.map(description => {
    for (const rule of rules) {
      if (matchesRule(description, { ...rule, pattern: rule.pattern })) {
        return { description, category: rule.category_name };
      }
    }
    return { description, category: 'Altro' };
  });
}

// Initialize default categories and rules (server-side only)
export function initializeDefaultCategories(): void {
  // Only run on server side
  if (typeof window !== 'undefined') {
    return;
  }
  
  try {
    const { db } = require('./database');
    
    // Check if categories already exist
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    if (existingCount.count > 0) {
      console.log('Categories already initialized');
      return;
    }
    
    const transaction = db.transaction(() => {
      // Insert default categories
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, type, color)
        VALUES (?, ?, ?)
      `);
      
      const categories = [
        { name: 'Alimenti', type: 'expense', color: '#ff6b6b' },
        { name: 'Trasporti', type: 'expense', color: '#4ecdc4' },
        { name: 'Casa', type: 'expense', color: '#45b7d1' },
        { name: 'Utenze', type: 'expense', color: '#f9ca24' },
        { name: 'Salute', type: 'expense', color: '#f0932b' },
        { name: 'Ristorazione', type: 'expense', color: '#eb4d4b' },
        { name: 'Abbigliamento', type: 'expense', color: '#6c5ce7' },
        { name: 'Svago', type: 'expense', color: '#a29bfe' },
        { name: 'Abbonamenti', type: 'expense', color: '#fd79a8' },
        { name: 'Spese Bancarie', type: 'expense', color: '#636e72' },
        { name: 'Stipendio', type: 'income', color: '#00b894' },
        { name: 'Altro', type: 'both', color: '#74b9ff' }
      ];
      
      categories.forEach(cat => {
        insertCategory.run(cat.name, cat.type, cat.color);
      });
      
      // Get category IDs for rules
      const getCategoryId = db.prepare('SELECT id FROM categories WHERE name = ?');
      
      // Insert basic rules from existing hardcoded logic
      const insertRule = db.prepare(`
        INSERT INTO category_rules (category_id, pattern, match_type, priority)
        VALUES (?, ?, ?, ?)
      `);
      
      const rules = [
        // Alimenti
        { category: 'Alimenti', pattern: 'supermercato', priority: 10 },
        { category: 'Alimenti', pattern: 'conad', priority: 10 },
        { category: 'Alimenti', pattern: 'famila', priority: 10 },
        { category: 'Alimenti', pattern: 'pim', priority: 10 },
        { category: 'Alimenti', pattern: 'macelleria', priority: 10 },
        
        // Trasporti
        { category: 'Trasporti', pattern: 'benzina', priority: 10 },
        { category: 'Trasporti', pattern: 'carburante', priority: 10 },
        { category: 'Trasporti', pattern: 'eni', priority: 10 },
        { category: 'Trasporti', pattern: 'tamoil', priority: 10 },
        
        // Casa
        { category: 'Casa', pattern: 'affitto', priority: 10 },
        { category: 'Casa', pattern: 'mutuo', priority: 5 }, // Higher priority
        { category: 'Casa', pattern: 'condominio', priority: 5 },
        { category: 'Casa', pattern: 'brico', priority: 10 },
        
        // Utenze
        { category: 'Utenze', pattern: 'enel', priority: 10 },
        { category: 'Utenze', pattern: 'tim', priority: 10 },
        { category: 'Utenze', pattern: 'vodafone', priority: 10 },
        { category: 'Utenze', pattern: 'wind', priority: 10 },
        
        // Salute
        { category: 'Salute', pattern: 'farmacia', priority: 10 },
        { category: 'Salute', pattern: 'medico', priority: 10 },
        { category: 'Salute', pattern: 'ospedale', priority: 10 },
        
        // Ristorazione
        { category: 'Ristorazione', pattern: 'ristorante', priority: 10 },
        { category: 'Ristorazione', pattern: 'pizzeria', priority: 10 },
        { category: 'Ristorazione', pattern: 'mcdonald', priority: 10 },
        { category: 'Ristorazione', pattern: 'deliveroo', priority: 10 },
        
        // Abbigliamento
        { category: 'Abbigliamento', pattern: 'zara', priority: 10 },
        { category: 'Abbigliamento', pattern: 'h&m', priority: 10 },
        { category: 'Abbigliamento', pattern: 'decathlon', priority: 10 },
        
        // Svago
        { category: 'Svago', pattern: 'cinema', priority: 10 },
        { category: 'Svago', pattern: 'teatro', priority: 10 },
        
        // Abbonamenti
        { category: 'Abbonamenti', pattern: 'netflix', priority: 10 },
        { category: 'Abbonamenti', pattern: 'spotify', priority: 10 },
        { category: 'Abbonamenti', pattern: 'amazon prime', priority: 10 },
        
        // Spese Bancarie
        { category: 'Spese Bancarie', pattern: 'commissioni', priority: 10 },
        { category: 'Spese Bancarie', pattern: 'canone', priority: 10 },
        { category: 'Spese Bancarie', pattern: 'bollo', priority: 10 },
        
        // Stipendio
        { category: 'Stipendio', pattern: 'stipendio', priority: 10 },
        { category: 'Stipendio', pattern: 'cedolino', priority: 10 },
        { category: 'Stipendio', pattern: 'accredito stipendio', priority: 5 }
      ];
      
      rules.forEach(rule => {
        const categoryResult = getCategoryId.get(rule.category) as { id: number } | undefined;
        if (categoryResult) {
          insertRule.run(categoryResult.id, rule.pattern, 'contains', rule.priority);
        }
      });
    });
    
    transaction();
    console.log('✅ Default categories and rules initialized');
    
  } catch (error) {
    console.error('Error initializing categories:', error);
  }
}
