import { NextRequest, NextResponse } from 'next/server';
import { getAllTransactions, getDatabaseStats, getAllCategories, getAllCategoryRules } from '@/lib/database';

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
    const body = await request.json();
    const { startDate, endDate, includeCategories = true, includeRules = true } = body;

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

    // Get categories and rules if requested
    const categories = includeCategories ? getAllCategories() : [];
    const categoryRules = includeRules ? getAllCategoryRules() : [];
    
    // Get database stats
    const databaseStats = getDatabaseStats();

    // Determine date range
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const actualStartDate = startDate || (sortedTransactions[0]?.date || new Date().toISOString());
    const actualEndDate = endDate || (sortedTransactions[sortedTransactions.length - 1]?.date || new Date().toISOString());

    // Create backup data structure
    const backupData: BackupData = {
      version: '1.0.0',
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
      category_rules: categoryRules
    };

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const rangeStr = startDate || endDate 
      ? `_${actualStartDate.split('T')[0]}_to_${actualEndDate.split('T')[0]}`
      : '_full';
    
    const filename = `pfinance_backup_${dateStr}_${timeStr}${rangeStr}.json`;

    // Return the backup as a JSON response with appropriate headers
    const response = new NextResponse(JSON.stringify(backupData, null, 2));
    
    response.headers.set('Content-Type', 'application/json');
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    return response;

  } catch (error) {
    console.error('Error creating database backup:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore durante la creazione del backup del database'
    }, { status: 500 });
  }
}