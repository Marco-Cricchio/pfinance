import { NextResponse } from 'next/server';
import { getParsedData, getDatabaseStats, clearAllTransactions, updateAccountBalance, getAccountBalance } from '@/lib/database';

export async function GET() {
  try {
    const data = getParsedData();
    const stats = getDatabaseStats();
    // Usa il saldo corrente memorizzato nel DB, non calcolato da tutte le transazioni
    const accountBalance = getAccountBalance();
    
    console.log(`📊 Caricati ${stats.totalTransactions} transazioni dal database`);
    console.log(`💰 Saldo contabile: €${accountBalance.toFixed(2)}`);
    
    return NextResponse.json({
      ...data,
      accountBalance,
      _meta: {
        totalTransactions: stats.totalTransactions,
        accountBalance,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Errore recupero transazioni:', error);
    return NextResponse.json(
      { error: 'Errore durante il recupero delle transazioni' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearAllTransactions();
    // Reset balance to initial value when clearing all transactions
    updateAccountBalance(9337.78);
    return NextResponse.json({ message: 'Tutte le transazioni sono state eliminate' });
  } catch (error) {
    console.error('Errore eliminazione transazioni:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'eliminazione delle transazioni' },
      { status: 500 }
    );
  }
}