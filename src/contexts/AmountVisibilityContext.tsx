'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AmountVisibilityContextType {
  isVisible: boolean;
  isLoading: boolean;
  toggleVisibility: () => Promise<void>;
  obfuscateAmount: (amount: number) => string;
}

const AmountVisibilityContext = createContext<AmountVisibilityContextType | undefined>(undefined);

interface AmountVisibilityProviderProps {
  children: ReactNode;
}

export function AmountVisibilityProvider({ children }: AmountVisibilityProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');

  const toggleVisibility = useCallback(async () => {
    if (isVisible) {
      // Hide amounts immediately
      setIsVisible(false);
      return;
    }

    // Show password dialog
    setShowPasswordDialog(true);
  }, [isVisible]);

  const handlePasswordSubmit = useCallback(async () => {
    if (!password) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.valid) {
        setIsVisible(true);
        setShowPasswordDialog(false);
        setPassword('');
      } else {
        alert('Password errata!');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      alert('Errore durante la verifica della password');
    } finally {
      setIsLoading(false);
    }
  }, [password]);

  const handlePasswordCancel = useCallback(() => {
    setShowPasswordDialog(false);
    setPassword('');
    setIsLoading(false);
  }, []);

  const obfuscateAmount = useCallback((amount: number): string => {
    if (isVisible) {
      return `€${amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
    }
    return '€●●●.●●';
  }, [isVisible]);

  return (
    <AmountVisibilityContext.Provider
      value={{
        isVisible,
        isLoading,
        toggleVisibility,
        obfuscateAmount,
      }}
    >
      {children}
      
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        if (!open) {
          handlePasswordCancel();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Accesso Sicuro</DialogTitle>
            <DialogDescription>
              Inserisci la password per visualizzare gli importi reali
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
                className="col-span-3"
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handlePasswordCancel}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button 
              onClick={handlePasswordSubmit}
              disabled={isLoading || !password}
            >
              {isLoading ? 'Verifica...' : 'Conferma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AmountVisibilityContext.Provider>
  );
}

export function useAmountVisibility() {
  const context = useContext(AmountVisibilityContext);
  if (context === undefined) {
    throw new Error('useAmountVisibility must be used within an AmountVisibilityProvider');
  }
  return context;
}