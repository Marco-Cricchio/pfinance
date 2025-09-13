'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, X, Eye } from 'lucide-react';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface BalanceValidation {
  currentBalance: number;
  baseBalance: number;
  calculatedBalance: number;
  difference: number;
  isWithinThreshold: boolean;
  hasAlert: boolean;
  alertLevel?: 'medium' | 'high';
  alertMessage?: string;
  baseDate?: string;
  fileSource?: string;
}

export function BalanceAlert() {
  const [validation, setValidation] = useState<BalanceValidation | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { obfuscateAmount } = useAmountVisibility();

  useEffect(() => {
    loadValidation();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadValidation, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadValidation = async () => {
    try {
      const response = await fetch('/api/balance/validate');
      if (response.ok) {
        const data = await response.json();
        setValidation(data.validation);
        
        // If there's a new alert, show it (reset dismissed state)
        if (data.validation?.hasAlert && !validation?.hasAlert) {
          setDismissed(false);
        }
      }
    } catch (error) {
      console.error('Error loading balance validation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything if loading, no validation data, no alert, or dismissed
  if (loading || !validation || !validation.hasAlert || dismissed) {
    return null;
  }

  const isHighAlert = validation.alertLevel === 'high';
  const Icon = isHighAlert ? AlertTriangle : AlertCircle;

  return (
    <Alert className={`border-l-4 ${
      isHighAlert 
        ? 'border-l-red-500 border-red-200 bg-red-50' 
        : 'border-l-yellow-500 border-yellow-200 bg-yellow-50'
    }`}>
      <Icon className={`h-4 w-4 ${isHighAlert ? 'text-red-600' : 'text-yellow-600'}`} />
      <AlertTitle className={isHighAlert ? 'text-red-800' : 'text-yellow-800'}>
        {isHighAlert ? '⚠️ Discrepanza Saldo Critica' : '⚠️ Discrepanza Saldo Rilevata'}
      </AlertTitle>
      <AlertDescription className={`space-y-2 ${isHighAlert ? 'text-red-700' : 'text-yellow-700'}`}>
        <div>{validation.alertMessage}</div>
        
        <div className="text-xs space-y-1">
          <div>Saldo Base: <strong>{obfuscateAmount(validation.baseBalance)}</strong></div>
          <div>Saldo Calcolato: <strong>{obfuscateAmount(validation.calculatedBalance)}</strong></div>
          {validation.fileSource && (
            <div>Origine: <strong>{validation.fileSource}</strong></div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              // Open balance management in sidebar
              const event = new CustomEvent('openBalanceManager');
              window.dispatchEvent(event);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            Gestisci Saldi
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3 w-3 mr-1" />
            Nascondi
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}