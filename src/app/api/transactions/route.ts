import { NextResponse } from 'next/server';
import { getParsedData, getDatabaseStats, clearAllTransactions, updateAccountBalance, getAccountBalance, calculateCurrentBalance } from '@/lib/database';

export async function GET() {
  try {
    const data = getParsedData();
    const stats = getDatabaseStats();
    
    // Enhanced balance information with validation
    const accountBalance = getAccountBalance();
    const balanceValidation = calculateCurrentBalance();
    
    console.log(`📊 Caricati ${stats.totalTransactions} transazioni dal database`);
    console.log(`💰 Saldo contabile: €${accountBalance.toFixed(2)}`);
    
    // Check for balance discrepancies
    if (!balanceValidation.isWithinThreshold) {
      console.log(`⚠️ Balance discrepancy detected: €${balanceValidation.difference.toFixed(2)}`);
    }
    
    return NextResponse.json({
      ...data,
      accountBalance,
      balanceValidation: {
        calculatedBalance: balanceValidation.calculatedBalance,
        difference: balanceValidation.difference,
        isWithinThreshold: balanceValidation.isWithinThreshold,
        baseDate: balanceValidation.baseDate,
        fileSource: balanceValidation.fileSource
      },
      _meta: {
        totalTransactions: stats.totalTransactions,
        accountBalance,
        hasBalanceAlert: !balanceValidation.isWithinThreshold,
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