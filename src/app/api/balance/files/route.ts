import { NextResponse } from 'next/server';
import { getAllFileBalances } from '@/lib/database';

/**
 * GET /api/balance/files
 * Returns all file balances available for selection
 */
export async function GET() {
  try {
    const fileBalances = getAllFileBalances();
    
    // Format dates for UI display (DD/MM/YYYY)
    const formattedBalances = fileBalances.map(balance => ({
      ...balance,
      balance_date_formatted: balance.balance_date 
        ? new Date(balance.balance_date).toLocaleDateString('it-IT')
        : undefined,
      created_at_formatted: new Date(balance.created_at).toLocaleDateString('it-IT')
    }));
    
    
    return NextResponse.json({
      success: true,
      balances: formattedBalances,
      count: fileBalances.length
    });
    
  } catch (error) {
    console.error('Error fetching file balances:', error);
    return NextResponse.json(
      { error: 'Errore durante il recupero dei saldi dai file' },
      { status: 500 }
    );
  }
}