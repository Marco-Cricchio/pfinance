import { NextRequest, NextResponse } from 'next/server';
import { insertTransactions, clearAllTransactions, createOrGetCategory, createOrGetCategoryRule, getCategoryByName } from '@/lib/database';

interface BackupData {
  version: string;
  created_at: string;
  metadata: {
    total_transactions: number;
    total_categories: number;
    total_rules: number;
    date_range: {
      from: string;
      to: string;
    };
    database_stats: any;
  };
  transactions: any[];
  categories: any[];
  category_rules: any[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const replaceExisting = formData.get('replaceExisting') === 'true';

    if (!file || !file.name.endsWith('.json')) {
      return NextResponse.json({
        success: false,
        error: 'File JSON di backup richiesto'
      }, { status: 400 });
    }

    // Read and parse backup file
    const fileContent = await file.text();
    let backupData: BackupData;
    
    try {
      backupData = JSON.parse(fileContent);
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'File di backup non valido o corrotto'
      }, { status: 400 });
    }

    // Validate backup structure
    if (!backupData.version || !backupData.transactions || !Array.isArray(backupData.transactions)) {
      return NextResponse.json({
        success: false,
        error: 'Struttura del file di backup non valida'
      }, { status: 400 });
    }

    const restoreResults = {
      transactions: { inserted: 0, duplicates: 0 },
      categories: { inserted: 0, errors: 0 },
      rules: { inserted: 0, errors: 0 }
    };

    // Clear existing data if requested
    if (replaceExisting) {
      clearAllTransactions();
      // Note: Categories and rules aren't cleared as they might be referenced
    }

    // Create a mapping from old category names to new category IDs
    const categoryMapping = new Map<string, number>();
    
    // Restore categories first (if present)
    if (backupData.categories && Array.isArray(backupData.categories)) {
      for (const category of backupData.categories) {
        try {
          // Check if category already exists
          const existingCategory = getCategoryByName(category.name);
          let categoryId: number;
          
          if (existingCategory) {
            categoryId = existingCategory.id;
            console.warn(`Category '${category.name}' already exists, using existing ID: ${categoryId}`);
          } else {
            // Create new category
            const newCategoryId = createOrGetCategory(category.name, category.type, category.color);
            if (newCategoryId) {
              categoryId = newCategoryId;
              restoreResults.categories.inserted++;
              console.warn(`Created new category '${category.name}' with ID: ${categoryId}`);
            } else {
              console.warn('Failed to create category:', category);
              restoreResults.categories.errors++;
              continue;
            }
          }
          
          // Store mapping for rule restoration
          categoryMapping.set(category.name, categoryId);
        } catch (error) {
          console.warn('Error processing category:', category, error);
          restoreResults.categories.errors++;
        }
      }
    }

    // Restore category rules (if present)
    if (backupData.category_rules && Array.isArray(backupData.category_rules)) {
      for (const rule of backupData.category_rules) {
        try {
          // Find the actual category ID for this rule
          let categoryId = rule.category_id;
          
          // If we have a category mapping, use the mapped ID
          if (backupData.categories) {
            const categoryFromBackup = backupData.categories.find(c => c.id === rule.category_id);
            if (categoryFromBackup) {
              const mappedId = categoryMapping.get(categoryFromBackup.name);
              if (mappedId) {
                categoryId = mappedId;
              }
            }
          }
          
          // Try to create the rule (will skip if duplicate exists)
          const ruleId = createOrGetCategoryRule(categoryId, rule.pattern, rule.match_type, rule.priority);
          if (ruleId) {
            restoreResults.rules.inserted++;
          }
        } catch (error) {
          console.warn('Error inserting category rule:', rule, error);
          restoreResults.rules.errors++;
        }
      }
    }

    // Restore transactions
    if (backupData.transactions.length > 0) {
      restoreResults.transactions = insertTransactions(backupData.transactions);
    }

    return NextResponse.json({
      success: true,
      message: 'Restore del database completato con successo',
      results: restoreResults,
      backup_metadata: {
        version: backupData.version,
        created_at: backupData.created_at,
        total_transactions: backupData.metadata?.total_transactions || backupData.transactions.length,
        date_range: backupData.metadata?.date_range
      }
    });

  } catch (error) {
    console.error('Error restoring database:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore durante il restore del database'
    }, { status: 500 });
  }
}