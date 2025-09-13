import { NextRequest, NextResponse } from 'next/server';
import { setActiveFileBalance } from '@/lib/database';

/**
 * POST /api/balance/select
 * Sets the active balance from a selected file
 * Body: { fileBalanceId: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { fileBalanceId } = await request.json();
    
    if (!fileBalanceId || isNaN(parseInt(fileBalanceId))) {
      return NextResponse.json(
        { error: 'ID saldo file valido richiesto' },
        { status: 400 }
      );
    }
    
    const success = setActiveFileBalance(parseInt(fileBalanceId));
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Saldo attivo aggiornato con successo',
        activeBalanceId: parseInt(fileBalanceId)
      });
    } else {
      return NextResponse.json(
        { error: 'Errore durante l\'aggiornamento del saldo attivo' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error setting active balance:', error);
    return NextResponse.json(
      { error: 'Errore durante la selezione del saldo' },
      { status: 500 }
    );
  }
}