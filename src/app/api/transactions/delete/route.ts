import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Get database instance
function getDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'pfinance.db');
  return new Database(dbPath);
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionIds, filters } = body;

    if (!transactionIds && !filters) {
      return NextResponse.json(
        { error: 'È richiesto specificare transactionIds o filters' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    let deletedCount = 0;

    if (transactionIds && Array.isArray(transactionIds)) {
      // Cancellazione selettiva per ID
      if (transactionIds.length === 0) {
        return NextResponse.json(
          { error: 'Array transactionIds è vuoto' },
          { status: 400 }
        );
      }

      const placeholders = transactionIds.map(() => '?').join(',');
      const deleteStmt = db.prepare(`
        DELETE FROM transactions 
        WHERE id IN (${placeholders})
      `);

      const result = deleteStmt.run(...transactionIds);
      deletedCount = result.changes;

    } else if (filters) {
      // Cancellazione con filtri
      let query = 'DELETE FROM transactions WHERE 1=1';
      const params: string[] = [];

      if (filters.categories && filters.categories.length > 0) {
        const categoryPlaceholders = filters.categories.map(() => '?').join(',');
        query += ` AND category IN (${categoryPlaceholders})`;
        params.push(...filters.categories);
      }

      if (filters.dateFrom) {
        query += ' AND date >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND date <= ?';
        params.push(filters.dateTo);
      }

      if (filters.type && filters.type !== 'all') {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      if (filters.amountMin) {
        query += ' AND ABS(amount) >= ?';
        params.push(parseFloat(filters.amountMin));
      }

      if (filters.amountMax) {
        query += ' AND ABS(amount) <= ?';
        params.push(parseFloat(filters.amountMax));
      }

      if (filters.description) {
        query += ' AND description LIKE ?';
        params.push(`%${filters.description}%`);
      }

      const deleteStmt = db.prepare(query);
      const result = deleteStmt.run(...params);
      deletedCount = result.changes;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} transazioni cancellate con successo`
    });

  } catch (error) {
    console.error('Errore nella cancellazione delle transazioni:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Endpoint GET per ottenere un preview delle transazioni che verrebbero cancellate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, action } = body;

    if (action !== 'preview') {
      return NextResponse.json(
        { error: 'Action deve essere "preview"' },
        { status: 400 }
      );
    }

    if (!filters) {
      return NextResponse.json(
        { error: 'Filtri richiesti per il preview' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    let query = 'SELECT id, date, amount, description, category, type FROM transactions WHERE 1=1';
    const params: string[] = [];

    if (filters.categories && filters.categories.length > 0) {
      const categoryPlaceholders = filters.categories.map(() => '?').join(',');
      query += ` AND category IN (${categoryPlaceholders})`;
      params.push(...filters.categories);
    }

    if (filters.dateFrom) {
      query += ' AND date >= ?';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ' AND date <= ?';
      params.push(filters.dateTo);
    }

    if (filters.type && filters.type !== 'all') {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.amountMin) {
      query += ' AND ABS(amount) >= ?';
      params.push(parseFloat(filters.amountMin));
    }

    if (filters.amountMax) {
      query += ' AND ABS(amount) <= ?';
      params.push(parseFloat(filters.amountMax));
    }

    if (filters.description) {
      query += ' AND description LIKE ?';
      params.push(`%${filters.description}%`);
    }

    query += ' ORDER BY date DESC LIMIT 100'; // Limita il preview a 100 risultati

    const stmt = db.prepare(query);
    const transactions = stmt.all(...params);

    return NextResponse.json({
      success: true,
      count: transactions.length,
      transactions,
      message: `${transactions.length} transazioni verrebbero cancellate`
    });

  } catch (error) {
    console.error('Errore nel preview delle transazioni:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}