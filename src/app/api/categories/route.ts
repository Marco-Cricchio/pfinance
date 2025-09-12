import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/database';

export async function GET() {
  try {
    const categories = getAllCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Errore durante il recupero delle categorie' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, type = 'both', color = '#8884d8' } = await request.json();
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome categoria richiesto' },
        { status: 400 }
      );
    }
    
    const categoryId = createCategory(name.trim(), type, color);
    
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Errore durante la creazione della categoria' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      categoryId,
      message: 'Categoria creata con successo'
    });
    
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Errore durante la creazione della categoria' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, type, color } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID categoria richiesto' },
        { status: 400 }
      );
    }
    
    const updates: { name?: string; type?: string; color?: string } = {};
    if (name) updates.name = name.trim();
    if (type) updates.type = type;
    if (color) updates.color = color;
    
    const success = updateCategory(id, updates);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Categoria non trovata o errore durante l\'aggiornamento' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Categoria aggiornata con successo'
    });
    
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'aggiornamento della categoria' },
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
        { error: 'ID categoria richiesto' },
        { status: 400 }
      );
    }
    
    const success = deleteCategory(parseInt(id));
    
    if (!success) {
      return NextResponse.json(
        { error: 'Categoria non trovata o errore durante l\'eliminazione' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Categoria eliminata con successo'
    });
    
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'eliminazione della categoria' },
      { status: 500 }
    );
  }
}
