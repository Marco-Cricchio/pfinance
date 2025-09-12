import { NextResponse } from 'next/server';
import { recategorizeAllTransactions, getParsedData } from '@/lib/database';
import { categorizeTransaction } from '@/lib/categorizer';

export async function POST() {
  try {
    // Use the new centralized categorization engine
    const categorizeFunction = (description: string): string => {
      // Create a mock transaction object for the categorizer
      const mockTransaction = {
        id: 'temp',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description,
        type: 'expense' as const,
        is_manual_override: false,
        manual_category_id: null
      };
      
      return categorizeTransaction(mockTransaction);
    };

    // Esegui la ricategorizzazione
    const updatedCount = recategorizeAllTransactions(categorizeFunction);
    
    // Recupera i dati aggiornati
    const updatedData = getParsedData();
    
    return NextResponse.json({
      success: true,
      message: `Ricategorizzate ${updatedCount} transazioni`,
      updatedCount,
      data: updatedData
    });
    
  } catch (error) {
    console.error('Errore ricategorizzazione:', error);
    return NextResponse.json(
      { error: 'Errore durante la ricategorizzazione delle transazioni' }, 
      { status: 500 }
    );
  }
}