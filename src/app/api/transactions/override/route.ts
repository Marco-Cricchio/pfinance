import { NextRequest, NextResponse } from 'next/server';
import { setManualCategory, removeManualCategory, getParsedData } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { transactionId, categoryId } = await request.json();
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'ID transazione richiesto' },
        { status: 400 }
      );
    }
    
    let success;
    if (categoryId) {
      success = setManualCategory(transactionId, categoryId);
    } else {
      success = removeManualCategory(transactionId);
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'Transazione non trovata o errore durante l\'aggiornamento' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: categoryId ? 'Override categoria impostato' : 'Override categoria rimosso'
    });
    
  } catch (error) {
    console.error('Error setting manual category override:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'impostazione dell\'override' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { transactions } = await request.json();
    
    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Array di transazioni richiesto' },
        { status: 400 }
      );
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const { transactionId, categoryId } of transactions) {
      if (!transactionId) continue;
      
      let success;
      if (categoryId) {
        success = setManualCategory(transactionId, categoryId);
      } else {
        success = removeManualCategory(transactionId);
      }
      
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }
    
    return NextResponse.json({ 
      success: true,
      successCount,
      errorCount,
      message: `${successCount} override impostati, ${errorCount} errori`
    });
    
  } catch (error) {
    console.error('Error bulk setting manual category overrides:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'impostazione degli override multipli' },
      { status: 500 }
    );
  }
}
