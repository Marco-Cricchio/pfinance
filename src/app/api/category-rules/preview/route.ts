import { NextRequest, NextResponse } from 'next/server';
import { previewCategorization } from '@/lib/categorizer';
import { getAllTransactions, getAllCategories } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { descriptions } = await request.json();
    
    if (!descriptions || !Array.isArray(descriptions)) {
      return NextResponse.json(
        { error: 'Array di descrizioni richiesto' },
        { status: 400 }
      );
    }
    
    const preview = previewCategorization(descriptions);
    
    return NextResponse.json({ 
      success: true,
      preview
    });
    
  } catch (error) {
    console.error('Error previewing categorization:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'anteprima della categorizzazione' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all transactions for preview (including manual overrides)
    const transactions = getAllTransactions();
    
    // Create preview using actual transaction categories (including manual ones)
    const preview = transactions.map(transaction => ({
      description: transaction.description,
      // Use the resolved category from getAllTransactions (which already considers manual overrides)
      category: transaction.category || 'Altro'
    }));
    
    // Get categories to include color information
    const categories = getAllCategories();
    const categoryMap = new Map(categories.map(c => [c.name, c]));
    
    // Enhance preview with color information
    const enhancedPreview = preview.map(item => ({
      ...item,
      color: categoryMap.get(item.category)?.color || '#74b9ff'
    }));
    
    return NextResponse.json({ 
      success: true,
      preview: enhancedPreview,
      categories
    });
    
  } catch (error) {
    console.error('Error getting sample preview:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'anteprima campione' },
      { status: 500 }
    );
  }
}
