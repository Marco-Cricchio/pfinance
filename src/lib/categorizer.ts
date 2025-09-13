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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
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
        // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { db } = require('./database');
    
    // Robust initialization check using persistent flag
    const initStatus = db.prepare(`
      SELECT categories_initialized, initialization_count, first_initialized_at 
      FROM system_initialization WHERE id = 1
    `).get() as { categories_initialized: number; initialization_count: number; first_initialized_at: string | null } | undefined;
    
    // If already initialized, skip
    if (initStatus?.categories_initialized) {
      // Update last checked timestamp
      db.prepare(`
        UPDATE system_initialization 
        SET last_checked_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `).run();
      return;
    }
    
    // Additional safety check: if categories exist but flag is not set, set the flag
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    if (existingCount.count > 0) {
      // Categories exist, mark as initialized to prevent future runs
      db.prepare(`
        UPDATE system_initialization 
        SET categories_initialized = 1,
            first_initialized_at = COALESCE(first_initialized_at, CURRENT_TIMESTAMP),
            initialization_count = initialization_count + 1,
            last_checked_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run();
      return;
    }
    
    const transaction = db.transaction(() => {
      // Insert only one example category
      const insertCategory = db.prepare(`
        INSERT INTO categories (name, type, color)
        VALUES (?, ?, ?)
      `);
      
      const categories = [
        { name: 'Altro', type: 'both', color: '#74b9ff' }
      ];
      
      categories.forEach(cat => {
        insertCategory.run(cat.name, cat.type, cat.color);
      });
      
      // Get category IDs for rules
      const getCategoryId = db.prepare('SELECT id FROM categories WHERE name = ?');
      
      // Insert only one example rule
      const insertRule = db.prepare(`
        INSERT INTO category_rules (category_id, pattern, match_type, priority)
        VALUES (?, ?, ?, ?)
      `);
      
      const rules = [
        // Single example rule
        { category: 'Altro', pattern: 'esempio', priority: 10 }
      ];
      
      rules.forEach(rule => {
        const categoryResult = getCategoryId.get(rule.category) as { id: number } | undefined;
        if (categoryResult) {
          insertRule.run(categoryResult.id, rule.pattern, 'contains', rule.priority);
        }
      });
    });
    
    // Execute the transaction
    transaction();
    
    // Mark initialization as complete
    db.prepare(`
      UPDATE system_initialization 
      SET categories_initialized = 1,
          first_initialized_at = COALESCE(first_initialized_at, CURRENT_TIMESTAMP),
          initialization_count = initialization_count + 1,
          last_checked_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run();
    
    console.warn('✅ Categories initialization completed successfully');
    
  } catch (error) {
    console.error('❌ Error initializing categories:', error);
    // Don't set the flag if there was an error
  }
}
