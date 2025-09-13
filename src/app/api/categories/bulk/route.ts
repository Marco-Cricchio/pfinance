import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function DELETE(request: NextRequest) {
  try {
    const { categoryIds } = await request.json();
    
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json({ error: 'IDs categorie richiesti' }, { status: 400 });
    }

    const placeholders = categoryIds.map(() => '?').join(',');
    
    // Start transaction for consistency
    const deleteTransaction = db.transaction(() => {
      // First delete associated category rules
      const deleteRulesStmt = db.prepare(`DELETE FROM category_rules WHERE category_id IN (${placeholders})`);
      deleteRulesStmt.run(...categoryIds);
      
      // Then delete categories
      const deleteCategoriesStmt = db.prepare(`DELETE FROM categories WHERE id IN (${placeholders})`);
      const result = deleteCategoriesStmt.run(...categoryIds);
      
      return result;
    });
    
    const result = deleteTransaction();
    
    return NextResponse.json({
      success: true,
      deletedCount: result.changes,
      message: `${result.changes} categorie eliminate con successo (incluse le relative regole)`
    });

  } catch (error) {
    console.error('Errore eliminazione bulk categorie:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'eliminazione delle categorie' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { categoryIds, updates } = await request.json();
    
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json({ error: 'IDs categorie richiesti' }, { status: 400 });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aggiornamenti richiesti' }, { status: 400 });
    }
    
    const placeholders = categoryIds.map(() => '?').join(',');
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const stmt = db.prepare(`
      UPDATE categories 
      SET ${setClause}, updated_at = datetime('now')
      WHERE id IN (${placeholders})
    `);
    
    const values = [...Object.values(updates), ...categoryIds];
    const result = stmt.run(...values);
    
    return NextResponse.json({
      success: true,
      updatedCount: result.changes,
      message: `${result.changes} categorie aggiornate con successo`
    });

  } catch (error) {
    console.error('Errore aggiornamento bulk categorie:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'aggiornamento delle categorie' },
      { status: 500 }
    );
  }
}