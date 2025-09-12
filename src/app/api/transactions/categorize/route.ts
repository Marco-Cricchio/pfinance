import { NextRequest, NextResponse } from 'next/server';
import { db, getAllTransactions } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { description, categoryId } = await request.json();
    
    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Descrizione transazione richiesta' },
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
    
    // Find transactions that match the provided description
    const matchingTransactions = allTransactions.filter(t => t.description === description);
    
    if (matchingTransactions.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna transazione trovata con la descrizione specificata' },
        { status: 404 }
      );
    }
    
    // Update transactions with manual category override
    const updateStmt = db.prepare(`
      UPDATE transactions 
      SET manual_category_id = ?, is_manual_override = 1, updated_at = CURRENT_TIMESTAMP
      WHERE description = ?
    `);
    
    const result = updateStmt.run(categoryId, description);
    
    console.log(`✅ Single categorization: ${result.changes} transactions updated with category ${categoryId} for description "${description}"`);
    
    return NextResponse.json({ 
      success: true,
      message: `${result.changes} transazioni aggiornate con successo`,
      updatedCount: result.changes,
      categoryId: parseInt(categoryId)
    });
    
  } catch (error) {
    console.error('Error in single categorization:', error);
    return NextResponse.json(
      { error: 'Errore durante la categorizzazione' },
      { status: 500 }
    );
  }
}