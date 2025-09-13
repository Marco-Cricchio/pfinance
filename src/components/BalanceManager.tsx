'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, DollarSign, FileText, Settings, History, TrendingUp, AlertTriangle, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface FileBalance {
  id: number;
  filename: string;
  balance: number;
  balance_date?: string;
  balance_date_formatted?: string;
  file_type: 'pdf' | 'xlsx';
  extraction_pattern?: string;
  is_selected: boolean;
  created_at: string;
  created_at_formatted?: string;
}

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

export function BalanceManager() {
  const [fileBalances, setFileBalances] = useState<FileBalance[]>([]);
  const [validation, setValidation] = useState<BalanceValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showBalancesDialog, setShowBalancesDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [auditLog, setAuditLog] = useState<any[]>([]);
  
  const { obfuscateAmount } = useAmountVisibility();

  // Load balance validation on component mount
  useEffect(() => {
    loadValidation();
    loadFileBalances();
  }, []);

  const loadValidation = async () => {
    try {
      const response = await fetch('/api/balance/validate');
      if (response.ok) {
        const data = await response.json();
        setValidation(data.validation);
      }
    } catch (error) {
      console.error('Error loading balance validation:', error);
    }
  };

  const loadFileBalances = async () => {
    try {
      const response = await fetch('/api/balance/files');
      if (response.ok) {
        const data = await response.json();
        setFileBalances(data.balances || []);
      }
    } catch (error) {
      console.error('Error loading file balances:', error);
    }
  };

  const loadAuditLog = async () => {
    try {
      const response = await fetch('/api/balance/audit?limit=10');
      if (response.ok) {
        const data = await response.json();
        setAuditLog(data.auditLog || []);
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
    }
  };

  const selectBalance = async (fileBalanceId: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/balance/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBalanceId })
      });
      
      if (response.ok) {
        await loadValidation();
        await loadFileBalances();
        // Refresh page to update all components
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Error selecting balance:', error);
      alert('Errore durante la selezione del saldo');
    } finally {
      setLoading(false);
    }
  };

  const overrideBalance = async () => {
    if (!overrideAmount || isNaN(parseFloat(overrideAmount))) {
      alert('Inserire un importo valido');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/balance/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          balance: parseFloat(overrideAmount),
          reason: overrideReason || 'Override manuale utente'
        })
      });
      
      if (response.ok) {
        setShowOverrideDialog(false);
        setOverrideAmount('');
        setOverrideReason('');
        await loadValidation();
        // Refresh page to update all components
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Error overriding balance:', error);
      alert('Errore durante l\'override del saldo');
    } finally {
      setLoading(false);
    }
  };

  const resetAllBalances = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/balance/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setShowResetDialog(false);
        await loadValidation();
        await loadFileBalances();
        // Refresh page to update all components
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Error resetting balances:', error);
      alert('Errore durante il reset dei saldi');
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = () => {
    if (!validation?.hasAlert) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return validation.alertLevel === 'high' 
      ? <AlertTriangle className="h-4 w-4 text-red-500" />
      : <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const selectedBalance = fileBalances.find(b => b.is_selected);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider">Gestione Saldi</h3>
      
      {/* Current Balance Status */}
      <div className="text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Saldo Corrente:</span>
          <div className="flex items-center gap-1">
            {getAlertIcon()}
            <span className="font-medium">
              {validation ? obfuscateAmount(validation.currentBalance) : '...'}
            </span>
          </div>
        </div>
        
        {selectedBalance && (
          <div className="text-muted-foreground">
            <div>📁 {selectedBalance.filename.substring(0, 20)}...</div>
            <div>📅 {selectedBalance.balance_date_formatted || 'N/A'}</div>
          </div>
        )}
        
        {validation?.hasAlert && (
          <div className={`text-xs p-2 rounded ${
            validation.alertLevel === 'high' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            ⚠️ Discrepanza rilevata: {obfuscateAmount(Math.abs(validation.difference))} {validation.difference > 0 ? 'in più' : 'in meno'} rispetto al saldo base
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-1">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => {
            loadFileBalances();
            setShowBalancesDialog(true);
          }}
        >
          <FileText className="h-3 w-3 mr-2" />
          Saldi Disponibili ({fileBalances.length})
        </Button>

        <Dialog open={showBalancesDialog} onOpenChange={setShowBalancesDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Saldi Disponibili dai File</DialogTitle>
              <DialogDescription>
                Seleziona quale saldo utilizzare come riferimento per i calcoli
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {fileBalances.map((balance) => (
                <div
                  key={balance.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    balance.is_selected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                    if (!balance.is_selected) {
                      selectBalance(balance.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{balance.filename}</div>
                      <div className="text-sm text-muted-foreground">
                        {balance.file_type.toUpperCase()} • {balance.balance_date_formatted || 'Data N/A'} • {balance.extraction_pattern}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{obfuscateAmount(balance.balance)}</div>
                      {balance.is_selected && (
                        <div className="text-xs text-primary">✓ Attivo</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBalancesDialog(false)}>
                Chiudi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => setShowOverrideDialog(true)}
        >
          <Settings className="h-3 w-3 mr-2" />
          Override Manuale
        </Button>

        <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Override Saldo Manuale</DialogTitle>
              <DialogDescription>
                Forza manualmente il saldo contabile. Questa operazione verrà registrata nell'audit log.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="override-amount">Nuovo Saldo (€)</Label>
                <Input
                  id="override-amount"
                  type="number"
                  step="0.01"
                  placeholder="9999.99"
                  value={overrideAmount}
                  onChange={(e) => setOverrideAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="override-reason">Motivo (opzionale)</Label>
                <Input
                  id="override-reason"
                  placeholder="Es: Correzione errore bancario"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter className="!flex !flex-col space-y-3">
              <Button onClick={overrideBalance} disabled={loading} className="w-full">
                {loading ? 'Elaborazione...' : 'Conferma Override'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowOverrideDialog(false)}
                className="w-full"
              >
                Annulla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => {
            loadAuditLog();
            setShowAuditDialog(true);
          }}
        >
          <History className="h-3 w-3 mr-2" />
          Storico Modifiche
        </Button>

        <Button
          variant="destructive"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => setShowResetDialog(true)}
        >
          <RotateCcw className="h-3 w-3 mr-2" />
          Reset Completo Saldi
        </Button>

        <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Storico Modifiche Saldo</DialogTitle>
              <DialogDescription>
                Cronologia di tutte le modifiche al saldo contabile
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {auditLog.map((entry) => (
                <div key={entry.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          entry.change_type === 'manual' ? 'bg-yellow-500' :
                          entry.change_type === 'file' ? 'bg-blue-500' :
                          entry.change_type === 'setup' ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                        <span className="font-medium">{entry.change_reason}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.created_at_formatted} • {entry.changed_by}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {entry.old_balance_formatted && (
                        <div className="text-muted-foreground line-through">
                          {obfuscateAmount(entry.old_balance)}
                        </div>
                      )}
                      <div className="font-bold">{obfuscateAmount(entry.new_balance)}</div>
                      {entry.change_amount_formatted && (
                        <div className={`text-xs ${entry.change_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.change_amount >= 0 ? '+' : ''}{obfuscateAmount(entry.change_amount)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAuditDialog(false)}>
                Chiudi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Completo Saldi</DialogTitle>
              <DialogDescription>
                Questa operazione eliminerà TUTTI i dati relativi ai saldi:
                <br />• Tutti i saldi estratti dai file
                <br />• Tutti gli override manuali
                <br />• Tutta la cronologia dei saldi
                <br />Il saldo corrente verrà impostato a 0.00€
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800">Attenzione!</div>
                    <div className="text-sm text-red-700 mt-1">
                      Questa azione è <strong>irreversibile</strong>. Tutti i dati relativi ai saldi verranno eliminati definitivamente e il saldo verrà resettato a zero.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="!flex !flex-col space-y-3">
              <Button 
                variant="destructive" 
                onClick={resetAllBalances} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Resettando...' : 'Conferma Reset Completo'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowResetDialog(false)}
                className="w-full"
              >
                Annulla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
