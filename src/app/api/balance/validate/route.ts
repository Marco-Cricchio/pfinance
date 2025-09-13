import { NextResponse } from 'next/server';
import { calculateCurrentBalance, getAccountBalance, getBalanceAuditLog } from '@/lib/database';

/**
 * GET /api/balance/validate
 * Validates current balance calculation against base balance
 * Returns discrepancy alerts if difference > €50
 */
export async function GET() {
  try {
    const validation = calculateCurrentBalance();
    const currentBalance = getAccountBalance();
    
    // Get recent audit log for context
    const auditLog = getBalanceAuditLog(5);
    
    
    const response = {
      success: true,
      validation: {
        currentBalance,
        baseBalance: validation.baseBalance,
        calculatedBalance: validation.calculatedBalance,
        difference: validation.difference,
        baseDate: validation.baseDate,
        fileSource: validation.fileSource,
        isWithinThreshold: validation.isWithinThreshold,
        threshold: 50.0,
        
        // Alert information
        hasAlert: !validation.isWithinThreshold,
        alertLevel: Math.abs(validation.difference) > 200 ? 'high' : 'medium',
        alertMessage: !validation.isWithinThreshold 
          ? `Discrepanza rilevata: €${Math.abs(validation.difference).toFixed(2)} ${validation.difference > 0 ? 'in più' : 'in meno'} rispetto al saldo base`
          : null
      },
      auditLog: auditLog.slice(0, 3) // Last 3 changes for context
    };
    
    if (!validation.isWithinThreshold) {
    } else {
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error validating balance:', error);
    return NextResponse.json(
      { error: 'Errore durante la validazione del saldo' },
      { status: 500 }
    );
  }
}