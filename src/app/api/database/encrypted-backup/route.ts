import { NextRequest, NextResponse } from 'next/server';
import { getAllTransactions, getDatabaseStats, getAllCategories, getAllCategoryRules, getAllFileBalances, getBalanceAuditLog } from '@/lib/database';
import { encryptSecret, generateSalt } from '@/lib/crypto';
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
  file_balances: any[];
  balance_audit_log: any[];
}

interface BackupOptions {
  password: string;
  startDate?: string;
  endDate?: string;
  includeCategories?: boolean;
  includeRules?: boolean;
  includeBalanceHistory?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      password, 
      startDate, 
      endDate, 
      includeCategories = true, 
      includeRules = true,
      includeBalanceHistory = true 
    }: BackupOptions = body;

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password deve essere di almeno 8 caratteri'
      }, { status: 400 });
    }

    // Get all transactions
    let transactions = getAllTransactions();
    
    // Apply date filter if provided
    if (startDate || endDate) {
      transactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        
        if (startDate && transactionDate < new Date(startDate)) {
          return false;
        }
        
        if (endDate && transactionDate > new Date(endDate)) {
          return false;
        }
        
        return true;
      });
    }

    // Get additional data if requested
    const categories = includeCategories ? getAllCategories() : [];
    const categoryRules = includeRules ? getAllCategoryRules() : [];
    const fileBalances = includeBalanceHistory ? getAllFileBalances() : [];
    const balanceAuditLog = includeBalanceHistory ? getBalanceAuditLog(1000) : [];
    
    // Get database stats
    const databaseStats = getDatabaseStats();

    // Determine date range
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const actualStartDate = startDate || (sortedTransactions[0]?.date || new Date().toISOString());
    const actualEndDate = endDate || (sortedTransactions[sortedTransactions.length - 1]?.date || new Date().toISOString());

    // Create backup data structure
    const backupData: EncryptedBackupData = {
      version: '2.0.0-encrypted',
      created_at: new Date().toISOString(),
      metadata: {
        total_transactions: transactions.length,
        total_categories: categories.length,
        total_rules: categoryRules.length,
        date_range: {
          from: actualStartDate,
          to: actualEndDate
        },
        database_stats: databaseStats
      },
      transactions,
      categories,
      category_rules: categoryRules,
      file_balances: fileBalances,
      balance_audit_log: balanceAuditLog
    };

    // Serialize to JSON
    const jsonData = JSON.stringify(backupData, null, 0); // No formatting to reduce size

    // Generate salt for this backup
    const salt = generateSalt();
    
    // Encrypt the data
    let encryptedData: string;
    try {
      encryptedData = encryptSecret(jsonData, password, salt);
    } catch (encryptError) {
      console.error('Encryption failed:', encryptError);
      return NextResponse.json({
        success: false,
        error: 'Errore durante la cifratura del backup'
      }, { status: 500 });
    }

    // Create file header with metadata
    const fileHeader = {
      version: '2.0.0',
      algorithm: 'AES-256-GCM',
      created_at: new Date().toISOString(),
      salt: salt,
      checksum: crypto.createHash('sha256').update(jsonData).digest('hex').substring(0, 16)
    };

    // Combine header and encrypted data
    const fileContent = {
      header: fileHeader,
      data: encryptedData
    };

    // Clear sensitive data from memory
    const sensitiveVars = [jsonData, password];
    sensitiveVars.forEach(variable => {
      if (typeof variable === 'string') {
        // Zero out the string (note: this doesn't guarantee memory is cleared in V8)
        variable.replace(/./g, '\0');
      }
    });

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const rangeStr = startDate || endDate 
      ? `_${actualStartDate.split('T')[0]}_to_${actualEndDate.split('T')[0]}`
      : '_full';
    
    const filename = `pfinance_backup_encrypted_${dateStr}_${timeStr}${rangeStr}.enc`;

    // Return the encrypted backup as a JSON response with appropriate headers
    const response = new NextResponse(JSON.stringify(fileContent, null, 2));
    
    response.headers.set('Content-Type', 'application/octet-stream');
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    response.headers.set('X-Backup-Type', 'encrypted');
    response.headers.set('X-Backup-Version', '2.0.0');
    
    return response;

  } catch (error) {
    console.error('Error creating encrypted database backup:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore durante la creazione del backup cifrato'
    }, { status: 500 });
  }
}