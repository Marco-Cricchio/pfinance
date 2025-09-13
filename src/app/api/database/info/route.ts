import { NextResponse } from 'next/server';
import { getDatabaseStats, getAllTransactions, getAllCategories, getAllCategoryRules } from '@/lib/database';

export async function GET() {
  try {
    // Get basic database stats
    const stats = getDatabaseStats();
    
    // Get all data for additional analysis
    const transactions = getAllTransactions();
    const categories = getAllCategories();
    const categoryRules = getAllCategoryRules();
    
    // Calculate date range
    const sortedTransactions = transactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const dateRange = {
      earliest: sortedTransactions[0]?.date || null,
      latest: sortedTransactions[sortedTransactions.length - 1]?.date || null
    };
    
    // Calculate category distribution
    const categoryDistribution = transactions.reduce((acc, transaction) => {
      const category = transaction.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate monthly transaction counts
    const monthlyStats = transactions.reduce((acc, transaction) => {
      const month = transaction.date.substring(0, 7); // YYYY-MM format
      if (!acc[month]) {
        acc[month] = { income: 0, expenses: 0, total: 0 };
      }
      acc[month][transaction.type === 'income' ? 'income' : 'expenses']++;
      acc[month].total++;
      return acc;
    }, {} as Record<string, { income: number; expenses: number; total: number }>);
    
    // Calculate averages
    const monthlyTransactionCounts = Object.values(monthlyStats).map(m => m.total);
    const avgTransactionsPerMonth = monthlyTransactionCounts.length > 0 
      ? monthlyTransactionCounts.reduce((a, b) => a + b, 0) / monthlyTransactionCounts.length 
      : 0;
    
    // Database health indicators
    const health = {
      hasTransactions: transactions.length > 0,
      hasCategories: categories.length > 0,
      hasRules: categoryRules.length > 0,
      dataConsistency: {
        transactionsWithValidDates: transactions.filter(t => !isNaN(new Date(t.date).getTime())).length,
        transactionsWithCategories: transactions.filter(t => t.category && t.category.trim() !== '').length,
        uncategorizedTransactions: transactions.filter(t => !t.category || t.category.trim() === '').length
      }
    };
    
    return NextResponse.json({
      success: true,
      database_info: {
        stats,
        totals: {
          transactions: transactions.length,
          categories: categories.length,
          category_rules: categoryRules.length
        },
        date_range: dateRange,
        health,
        insights: {
          category_distribution: categoryDistribution,
          monthly_stats: monthlyStats,
          averages: {
            transactions_per_month: Math.round(avgTransactionsPerMonth * 100) / 100
          },
          data_quality: {
            transactions_with_valid_dates: health.dataConsistency.transactionsWithValidDates,
            categorized_percentage: transactions.length > 0 
              ? Math.round((health.dataConsistency.transactionsWithCategories / transactions.length) * 10000) / 100
              : 0
          }
        }
      }
    });

  } catch (error) {
    console.error('Error getting database info:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore durante il recupero delle informazioni del database'
    }, { status: 500 });
  }
}