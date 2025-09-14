'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Key, 
  Shield, 
  Eye, 
  EyeOff, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Lock,
  Unlock
} from 'lucide-react';

interface SecretsStatus {
  hasDeobfuscationPassword: boolean;
  hasOpenRouterApiKey: boolean;
  isDefaultPassword: boolean;
  lastUpdated?: string;
}

export function SecretsManager() {
  const [secretsStatus, setSecretsStatus] = useState<SecretsStatus>({
    hasDeobfuscationPassword: false,
    hasOpenRouterApiKey: false,
    isDefaultPassword: true
  });
  const [loading, setLoading] = useState(true);
  const [showDeobfuscationDialog, setShowDeobfuscationDialog] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showSystemAuthDialog, setShowSystemAuthDialog] = useState(false);
  const [systemPassword, setSystemPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  const [pendingAction, setPendingAction] = useState<'deobfuscation' | 'apikey' | null>(null);

  // Load secrets status
  useEffect(() => {
    loadSecretsStatus();
  }, []);

  const loadSecretsStatus = async () => {
    try {
      const response = await fetch('/api/secrets');
      if (response.ok) {
        const data = await response.json();
        setSecretsStatus(data);
      }
    } catch (error) {
      console.error('Error loading secrets status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemAuth = async () => {
    if (!systemPassword) {
      setError('Password di sistema richiesta');
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const response = await fetch('/api/auth/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: systemPassword })
      });

      const result = await response.json();

      if (result.success) {
        // Continue with the pending action
        if (pendingAction === 'deobfuscation') {
          await updateDeobfuscationPassword();
        } else if (pendingAction === 'apikey') {
          await updateApiKey();
        }
      } else {
        setError(result.error || 'Autenticazione fallita');
      }
    } catch (error) {
      setError('Errore durante l\'autenticazione');
    } finally {
      setUpdating(false);
    }
  };

  const updateDeobfuscationPassword = async () => {
    if (!newPassword) {
      setError('Nuova password richiesta');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (newPassword.length < 4) {
      setError('La password deve essere di almeno 4 caratteri');
      return;
    }

    try {
      const response = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deobfuscation_password',
          value: newPassword,
          systemPassword: systemPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setShowDeobfuscationDialog(false);
        setShowSystemAuthDialog(false);
        resetForm();
        loadSecretsStatus();
      } else {
        setError(result.error || 'Errore durante l\'aggiornamento');
      }
    } catch (error) {
      setError('Errore durante l\'aggiornamento della password');
    }
  };

  const updateApiKey = async () => {
    try {
      const response = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'openrouter_api_key',
          value: apiKey,
          systemPassword: systemPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setShowApiKeyDialog(false);
        setShowSystemAuthDialog(false);
        resetForm();
        loadSecretsStatus();
      } else {
        setError(result.error || 'Errore durante l\'aggiornamento');
      }
    } catch (error) {
      setError('Errore durante l\'aggiornamento della chiave API');
    }
  };

  const resetForm = () => {
    setSystemPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setApiKey('');
    setError('');
    setPendingAction(null);
  };

  const startDeobfuscationUpdate = () => {
    resetForm();
    setPendingAction('deobfuscation');
    setShowDeobfuscationDialog(true);
  };

  const startApiKeyUpdate = () => {
    resetForm();
    setPendingAction('apikey');
    setShowApiKeyDialog(true);
  };

  const proceedWithSystemAuth = () => {
    setShowDeobfuscationDialog(false);
    setShowApiKeyDialog(false);
    setShowSystemAuthDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Caricamento configurazione...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestione Credenziali
          </CardTitle>
          <CardDescription>
            Configura le credenziali per la sicurezza dell'applicazione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Deobfuscation Password Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Password Deobfuscation</h3>
                {secretsStatus.isDefaultPassword ? (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <Info className="h-3 w-3 mr-1" />
                    Default
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Lock className="h-3 w-3 mr-1" />
                    Personalizzata
                  </Badge>
                )}
              </div>
              <Button
                variant="outline" 
                size="sm"
                onClick={startDeobfuscationUpdate}
              >
                {secretsStatus.hasDeobfuscationPassword ? 'Modifica' : 'Configura'}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {secretsStatus.isDefaultPassword 
                ? "Password corrente: pFinance (predefinita - si consiglia di cambiarla)"
                : "Password personalizzata configurata e crittografata in modo sicuro"
              }
            </p>
          </div>

          <Separator />

          {/* OpenRouter API Key Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Chiave API OpenRouter</h3>
                {secretsStatus.hasOpenRouterApiKey ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configurata
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <Unlock className="h-3 w-3 mr-1" />
                    Non configurata
                  </Badge>
                )}
              </div>
              <Button
                variant="outline" 
                size="sm"
                onClick={startApiKeyUpdate}
              >
                {secretsStatus.hasOpenRouterApiKey ? 'Modifica' : 'Configura'}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {secretsStatus.hasOpenRouterApiKey 
                ? "Chiave API configurata e crittografata in modo sicuro. Necessaria per l'AI Chat."
                : "Nessuna chiave API configurata. L'AI Chat non funzionerà senza di essa."
              }
            </p>
          </div>

          {secretsStatus.lastUpdated && (
            <div className="text-xs text-muted-foreground border-t pt-4">
              Ultimo aggiornamento: {new Date(secretsStatus.lastUpdated).toLocaleString('it-IT')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deobfuscation Password Dialog */}
      <Dialog open={showDeobfuscationDialog} onOpenChange={setShowDeobfuscationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configura Password Deobfuscation</DialogTitle>
            <DialogDescription>
              Questa password verrà utilizzata per visualizzare gli importi reali nell'applicazione.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Inserisci la nuova password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Conferma Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Conferma la password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeobfuscationDialog(false)}>
              Annulla
            </Button>
            <Button onClick={proceedWithSystemAuth} disabled={!newPassword || !confirmPassword}>
              Continua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configura Chiave API OpenRouter</DialogTitle>
            <DialogDescription>
              Inserisci la tua chiave API di OpenRouter per abilitare l'AI Chat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Chiave API OpenRouter</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="sk-or-v1-xxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Puoi ottenere una chiave API gratuita su{' '}
                <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline">
                  openrouter.ai
                </a>
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Annulla
            </Button>
            <Button onClick={proceedWithSystemAuth}>
              Continua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Authentication Dialog */}
      <Dialog open={showSystemAuthDialog} onOpenChange={setShowSystemAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Autenticazione Sistema Richiesta</DialogTitle>
            <DialogDescription>
              Per motivi di sicurezza, inserisci la password del tuo account di sistema (macOS/Windows/Linux) per procedere.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Questa è la stessa password che usi per accedere al tuo computer. 
                Non verrà memorizzata e verrà utilizzata solo per crittografare i tuoi secrets.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="system-password">Password di Sistema</Label>
              <Input
                id="system-password"
                type="password"
                placeholder="Password del tuo account sistema"
                value={systemPassword}
                onChange={(e) => setSystemPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSystemAuth();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSystemAuthDialog(false)}
              disabled={updating}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSystemAuth} 
              disabled={!systemPassword || updating}
            >
              {updating ? 'Autenticazione...' : 'Autentica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}