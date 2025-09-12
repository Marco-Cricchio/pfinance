import { NextRequest, NextResponse } from 'next/server';
import { getAllCategoryRules, createCategoryRule, updateCategoryRule, deleteCategoryRule } from '@/lib/database';
import { previewCategorization } from '@/lib/categorizer';

export async function GET() {
  try {
    const rules = getAllCategoryRules();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching category rules:', error);
    return NextResponse.json(
      { error: 'Errore durante il recupero delle regole' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, pattern, matchType = 'contains', priority = 0 } = await request.json();
    
    if (!categoryId || !pattern || pattern.trim().length === 0) {
      return NextResponse.json(
        { error: 'ID categoria e pattern richiesti' },
        { status: 400 }
      );
    }
    
    const ruleId = createCategoryRule(categoryId, pattern.trim(), matchType, priority);
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'Errore durante la creazione della regola' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      ruleId,
      message: 'Regola creata con successo'
    });
    
  } catch (error) {
    console.error('Error creating category rule:', error);
    return NextResponse.json(
      { error: 'Errore durante la creazione della regola' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, pattern, matchType, priority, enabled } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID regola richiesto' },
        { status: 400 }
      );
    }
    
    const updates: { pattern?: string; matchType?: string; priority?: number; enabled?: boolean } = {};
    if (pattern) updates.pattern = pattern.trim();
    if (matchType) updates.matchType = matchType;
    if (priority !== undefined) updates.priority = priority;
    if (enabled !== undefined) updates.enabled = enabled;
    
    const success = updateCategoryRule(id, updates);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Regola non trovata o errore durante l\'aggiornamento' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Regola aggiornata con successo'
    });
    
  } catch (error) {
    console.error('Error updating category rule:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'aggiornamento della regola' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID regola richiesto' },
        { status: 400 }
      );
    }
    
    const success = deleteCategoryRule(parseInt(id));
    
    if (!success) {
      return NextResponse.json(
        { error: 'Regola non trovata o errore durante l\'eliminazione' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Regola eliminata con successo'
    });
    
  } catch (error) {
    console.error('Error deleting category rule:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'eliminazione della regola' },
      { status: 500 }
    );
  }
}
