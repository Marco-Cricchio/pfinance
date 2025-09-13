import { NextResponse } from 'next/server';
import { resetAllBalances, db } from '@/lib/database';

export async function POST() {
  try {
    // Execute complete balance reset using helper function
    const result = resetAllBalances();
    
    return NextResponse.json({
      success: true,
      message: 'Reset completo dei saldi completato con successo',
      details: {
        fileBalancesDeleted: result.fileBalancesDeleted,
        auditLogEntriesDeleted: result.auditLogEntriesDeleted,
        accountBalanceReset: result.accountBalanceReset,
        oldBalance: result.oldBalance,
        newBalance: result.newBalance,
        resetTimestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Errore durante il reset completo dei saldi:', error);
    return NextResponse.json(
      { error: 'Errore durante il reset completo dei saldi' },
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