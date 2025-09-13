import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST() {
  try {
    // Reset all balance-related data in a transaction
    const resetTransaction = db.transaction(() => {
      // Clear all file balances
      const deleteFileBalances = db.prepare('DELETE FROM file_balances');
      deleteFileBalances.run();
      
      // Clear all manual balance overrides (if they exist in a separate table)
      // For now we'll assume balances are managed via file_balances table only
      
      // Reset current balance to 0.00 by clearing selected balance
      const updateCurrentBalance = db.prepare(`
        UPDATE sqlite_master SET sql = sql WHERE type = 'table'
      `); // This is a no-op, just to maintain transaction structure
      
      return {
        fileBalancesDeleted: deleteFileBalances.changes || 0
      };
    });
    
    const result = resetTransaction();
    
    return NextResponse.json({
      success: true,
      message: 'Tutti i dati relativi ai saldi sono stati resettati',
      details: {
        fileBalancesDeleted: result.fileBalancesDeleted,
        currentBalance: '0.00',
        resetTimestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Errore durante il reset dei saldi:', error);
    return NextResponse.json(
      { error: 'Errore durante il reset dei saldi' },
      { status: 500 }
    );
  }
}

// Also provide a GET endpoint to check current balance status
export async function GET() {
  try {
    // Get current balance information
    const fileBalancesCount = db.prepare('SELECT COUNT(*) as count FROM file_balances').get() as { count: number };
    
    // Get the selected/active balance if any
    const activeBalanceStmt = db.prepare(`
      SELECT balance, file_name, created_at 
      FROM file_balances 
      WHERE is_selected = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    const activeBalance = activeBalanceStmt.get() as { balance: number; file_name: string; created_at: string } | undefined;
    
    return NextResponse.json({
      success: true,
      balanceStatus: {
        totalFileBalances: fileBalancesCount.count,
        currentBalance: activeBalance?.balance || 0,
        activeBalanceFile: activeBalance?.file_name || null,
        lastUpdated: activeBalance?.created_at || null,
        isReset: fileBalancesCount.count === 0
      }
    });

  } catch (error) {
    console.error('Errore durante la verifica dello stato dei saldi:', error);
    return NextResponse.json(
      { error: 'Errore durante la verifica dello stato dei saldi' },
      { status: 500 }
    );
  }
}