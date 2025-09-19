import { NextRequest, NextResponse } from 'next/server';
import { insertTransactions, clearAllTransactions, createOrGetCategory, createOrGetCategoryRule, getCategoryByName, saveFileBalance, setActiveFileBalance } from '@/lib/database';
import { decryptSecret, verifyPassword } from '@/lib/crypto';
import crypto from 'crypto';

interface EncryptedBackupData {
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
  file_balances?: any[];
  balance_audit_log?: any[];
}

interface EncryptedFileContent {
  header: {
    version: string;
    algorithm: string;
    created_at: string;
    salt: string;
    checksum: string;
  };
  data: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max file size

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const password = formData.get('password') as string;
    const replaceExisting = formData.get('replaceExisting') === 'true';

    // Validate inputs
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'File di backup richiesto'
      }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Password richiesta per decifrare il backup'
      }, { status: 400 });
    }

    // Validate file type and size
    if (!file.name.endsWith('.enc')) {
      return NextResponse.json({
        success: false,
        error: 'File deve essere un backup cifrato (.enc)'
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'File troppo grande (massimo 100MB)'
      }, { status: 400 });
    }

    // Read and parse encrypted file
    let fileContent: string;
    let encryptedFileContent: EncryptedFileContent;
    
    try {
      fileContent = await file.text();
      encryptedFileContent = JSON.parse(fileContent);
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'File di backup cifrato non valido o corrotto'
      }, { status: 400 });
    }

    // Validate file structure
    if (!encryptedFileContent.header || !encryptedFileContent.data) {
      return NextResponse.json({
        success: false,
        error: 'Struttura del file di backup cifrato non valida'
      }, { status: 400 });
    }

    const { header, data: encryptedData } = encryptedFileContent;

    // Validate header
    if (!header.version || !header.salt || !header.checksum || !header.algorithm) {
      return NextResponse.json({
        success: false,
        error: 'Header del file di backup non valido'
      }, { status: 400 });
    }

    // Check algorithm compatibility
    if (header.algorithm !== 'AES-256-GCM') {
      return NextResponse.json({
        success: false,
        error: `Algoritmo di cifratura non supportato: ${header.algorithm}`
      }, { status: 400 });
    }

    // Attempt to decrypt the data
    let decryptedData: string;
    let backupData: EncryptedBackupData;
    
    try {
      decryptedData = decryptSecret(encryptedData, password, header.salt);
    } catch (decryptError) {
      console.error('Decryption failed:', decryptError);
      return NextResponse.json({
        success: false,
        error: 'Password errata o file corrotto. Impossibile decifrare il backup.'
      }, { status: 401 });
    }

    // Verify data integrity with checksum
    const calculatedChecksum = crypto.createHash('sha256').update(decryptedData).digest('hex').substring(0, 16);
    if (calculatedChecksum !== header.checksum) {
      return NextResponse.json({
        success: false,
        error: 'Checksum non valido. Il file potrebbe essere corrotto.'
      }, { status: 400 });
    }

    // Parse decrypted JSON
    try {
      backupData = JSON.parse(decryptedData);
    } catch (jsonError) {
      return NextResponse.json({
        success: false,
        error: 'Dati decifrati non validi'
      }, { status: 400 });
    }

    // Validate backup data structure
    if (!backupData.version || !backupData.transactions || !Array.isArray(backupData.transactions)) {
      return NextResponse.json({
        success: false,
        error: 'Struttura dei dati del backup non valida'
      }, { status: 400 });
    }

    // Clear sensitive data from memory immediately
    decryptedData = decryptedData.replace(/./g, '\0');
    password.replace(/./g, '\0');

    const restoreResults = {
      transactions: { inserted: 0, duplicates: 0 },
      categories: { inserted: 0, errors: 0 },
      rules: { inserted: 0, errors: 0 },
      file_balances: { inserted: 0, errors: 0 }
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

    // Restore file balances (if present)
    if (backupData.file_balances && Array.isArray(backupData.file_balances)) {
      for (const fileBalance of backupData.file_balances) {
        try {
          const balanceId = saveFileBalance(
            fileBalance.filename,
            fileBalance.balance,
            fileBalance.file_type,
            fileBalance.balance_date,
            fileBalance.extraction_pattern
          );
          
          if (balanceId) {
            restoreResults.file_balances.inserted++;
            
            // If this was the selected balance in the backup, set it as active
            if (fileBalance.is_selected) {
              setActiveFileBalance(balanceId);
            }
          }
        } catch (error) {
          console.warn('Error restoring file balance:', fileBalance, error);
          restoreResults.file_balances.errors++;
        }
      }
    }

    // Restore transactions
    if (backupData.transactions.length > 0) {
      restoreResults.transactions = insertTransactions(backupData.transactions);
    }

    return NextResponse.json({
      success: true,
      message: 'Restore del backup cifrato completato con successo',
      results: restoreResults,
      backup_metadata: {
        version: backupData.version,
        created_at: backupData.created_at,
        total_transactions: backupData.metadata?.total_transactions || backupData.transactions.length,
        date_range: backupData.metadata?.date_range,
        file_created_at: header.created_at,
        algorithm: header.algorithm
      }
    });

  } catch (error) {
    console.error('Error restoring encrypted database backup:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore durante il restore del backup cifrato'
    }, { status: 500 });
  }
}