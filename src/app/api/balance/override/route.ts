import { NextRequest, NextResponse } from 'next/server';
import { setManualBalance } from '@/lib/database';

/**
 * POST /api/balance/override
 * Manually override the account balance
 * Body: { balance: number, reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { balance, reason } = await request.json();
    
    if (balance === undefined || balance === null || isNaN(parseFloat(balance))) {
      return NextResponse.json(
        { error: 'Saldo valido richiesto' },
        { status: 400 }
      );
    }
    
    const numericBalance = parseFloat(balance);
    
    // Basic validation - reasonable balance limits
    if (numericBalance < -1000000 || numericBalance > 1000000) {
      return NextResponse.json(
        { error: 'Saldo non realistico. Inserire un valore tra -€1.000.000 e €1.000.000' },
        { status: 400 }
      );
    }
    
    const overrideReason = reason || 'Correzione manuale utente';
    const success = setManualBalance(numericBalance, overrideReason);
    
    if (success) {
      console.log(`🔧 Manual balance override: €${numericBalance} (Reason: ${overrideReason})`);
      
      return NextResponse.json({
        success: true,
        message: `Saldo aggiornato manualmente a €${numericBalance.toFixed(2)}`,
        balance: numericBalance,
        reason: overrideReason
      });
    } else {
      return NextResponse.json(
        { error: 'Errore durante l\'override del saldo' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in manual balance override:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'override manuale del saldo' },
      { status: 500 }
    );
  }
}