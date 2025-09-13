import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function DELETE(request: NextRequest) {
  try {
    const { ruleIds } = await request.json();
    
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      return NextResponse.json({ error: 'IDs regole richiesti' }, { status: 400 });
    }

    const placeholders = ruleIds.map(() => '?').join(',');
    
    const stmt = db.prepare(`DELETE FROM category_rules WHERE id IN (${placeholders})`);
    const result = stmt.run(...ruleIds);
    
    return NextResponse.json({
      success: true,
      deletedCount: result.changes,
      message: `${result.changes} regole eliminate con successo`
    });

  } catch (error) {
    console.error('Errore eliminazione bulk regole:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'eliminazione delle regole' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { ruleIds, updates } = await request.json();
    
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      return NextResponse.json({ error: 'IDs regole richiesti' }, { status: 400 });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aggiornamenti richiesti' }, { status: 400 });
    }
    
    const placeholders = ruleIds.map(() => '?').join(',');
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const stmt = db.prepare(`
      UPDATE category_rules 
      SET ${setClause}, updated_at = datetime('now')
      WHERE id IN (${placeholders})
    `);
    
    const values = [...Object.values(updates), ...ruleIds];
    const result = stmt.run(...values);
    
    return NextResponse.json({
      success: true,
      updatedCount: result.changes,
      message: `${result.changes} regole aggiornate con successo`
    });

  } catch (error) {
    console.error('Errore aggiornamento bulk regole:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'aggiornamento delle regole' },
      { status: 500 }
    );
  }
}