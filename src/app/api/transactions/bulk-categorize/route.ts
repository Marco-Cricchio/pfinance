import { NextRequest, NextResponse } from 'next/server';
import { db, getAllTransactions } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { descriptions, categoryId } = await request.json();
    
    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return NextResponse.json(
        { error: 'Array di descrizioni richiesto' },
        { status: 400 }
      );
    }
    
    if (!categoryId || isNaN(parseInt(categoryId))) {
      return NextResponse.json(
        { error: 'ID categoria valido richiesto' },
        { status: 400 }
      );
    }
    
    // Get all transactions to find matching ones
    const allTransactions = getAllTransactions();
    
    // Find transactions that match the provided descriptions
    const matchingTransactionIds = allTransactions
      .filter(t => descriptions.includes(t.description))
      .map(t => t.id);
    
    if (matchingTransactionIds.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna transazione trovata con le descrizioni specificate' },
        { status: 404 }
      );
    }
    
    // Update transactions with manual category override
    const updateStmt = db.prepare(`
      UPDATE transactions 
      SET manual_category_id = ?, is_manual_override = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    let updatedCount = 0;
    const updateTransaction = db.transaction(() => {
      for (const transactionId of matchingTransactionIds) {
        const result = updateStmt.run(categoryId, transactionId);
        if (result.changes > 0) {
          updatedCount++;
        }
      }
    });
    
    updateTransaction();
    
    
    return NextResponse.json({ 
      success: true,
      message: `${updatedCount} transazioni aggiornate con successo`,
      updatedCount,
      categoryId: parseInt(categoryId)
    });
    
  } catch (error) {
    console.error('Error in bulk categorization:', error);
    return NextResponse.json(
      { error: 'Errore durante la categorizzazione bulk' },
      { status: 500 }
    );
  }
}