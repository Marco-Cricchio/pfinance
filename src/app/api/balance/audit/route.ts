import { NextRequest, NextResponse } from 'next/server';
import { getBalanceAuditLog } from '@/lib/database';

/**
 * GET /api/balance/audit?limit=20
 * Returns the audit log of balance changes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Validate limit
    const validLimit = Math.min(Math.max(limit, 1), 100); // Between 1 and 100
    
    const auditLog = getBalanceAuditLog(validLimit);
    
    // Format audit log for UI display
    const formattedLog = auditLog.map(entry => ({
      ...entry,
      created_at_formatted: new Date(entry.created_at).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      old_balance_formatted: entry.old_balance !== null && entry.old_balance !== undefined
        ? `€${entry.old_balance.toFixed(2)}`
        : null,
      new_balance_formatted: `€${entry.new_balance.toFixed(2)}`,
      change_amount: entry.old_balance !== null && entry.old_balance !== undefined
        ? entry.new_balance - entry.old_balance
        : null,
      change_amount_formatted: entry.old_balance !== null && entry.old_balance !== undefined
        ? `${entry.new_balance - entry.old_balance >= 0 ? '+' : ''}€${(entry.new_balance - entry.old_balance).toFixed(2)}`
        : null,
      change_type: entry.change_reason === 'manual_override' ? 'manual' : 
                   entry.change_reason === 'file_selection' ? 'file' : 
                   entry.change_reason === 'initial_setup' ? 'setup' : 'other'
    }));
    
    
    return NextResponse.json({
      success: true,
      auditLog: formattedLog,
      count: auditLog.length,
      limit: validLimit
    });
    
  } catch (error) {
    console.error('Error fetching balance audit log:', error);
    return NextResponse.json(
      { error: 'Errore durante il recupero del log delle modifiche' },
      { status: 500 }
    );
  }
}