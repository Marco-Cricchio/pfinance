'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Wallet, Zap, RefreshCw, Tag, Trash2 } from 'lucide-react';

import { DatabaseBackup } from '@/components/settings/DatabaseBackup';
import { DatabaseRestore } from '@/components/settings/DatabaseRestore';
import { DatabaseInfo } from '@/components/settings/DatabaseInfo';
import { BalanceManager } from '@/components/BalanceManager';
import { SecretsManager } from '@/components/settings/SecretsManager';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        // Trigger a page reload to refresh all data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recategorizeTransactions = async () => {
    if (confirm('Vuoi ricategorizzare tutte le transazioni esistenti con le regole di categorizzazione correnti?')) {
      setLoading(true);
      try {
        const response = await fetch('/api/recategorize', { method: 'POST' });
        if (response.ok) {
          const result = await response.json();
          alert(`Ricategorizzazione completata: ${result.updatedCount} transazioni aggiornate.`);
          window.location.reload();
        }
      } catch (error) {
        console.error('Error recategorizing:', error);
        alert('Errore durante la ricategorizzazione.');
      } finally {
        setLoading(false);
      }
    }
  };

  const clearAllData = async () => {
    if (confirm('Sei sicuro di voler eliminare tutte le transazioni? Questa azione non può essere annullata.')) {
      if (confirm('ULTIMA CONFERMA: Tutti i tuoi dati finanziari saranno eliminati definitivamente. Confermi?')) {
        setLoading(true);
        try {
          const response = await fetch('/api/transactions', { method: 'DELETE' });
          if (response.ok) {
            alert('Tutti i dati sono stati eliminati.');
            window.location.reload();
          }
        } catch (error) {
          console.error('Error deleting data:', error);
          alert('Errore durante l\'eliminazione dei dati.');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Impostazioni</h1>
          <p className="text-muted-foreground">Gestisci backup, saldi e operazioni di sistema</p>
        </div>
      </div>

      <Tabs defaultValue="database" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Gestione Saldi
          </TabsTrigger>
          <TabsTrigger value="secrets" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Credenziali
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Azioni Rapide
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Informazioni
          </TabsTrigger>
        </TabsList>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Backup Section */}
            <DatabaseBackup />
            
            {/* Restore Section */}
            <DatabaseRestore />
          </div>
        </TabsContent>

        {/* Balance Management Tab */}
        <TabsContent value="balance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Gestione Saldi
              </CardTitle>
              <CardDescription>
                Gestisci i saldi contabili, visualizza la cronologia e effettua override manuali
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BalanceManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Secrets Management Tab */}
        <TabsContent value="secrets" className="space-y-6">
          <SecretsManager />
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Azioni Rapide
              </CardTitle>
              <CardDescription>
                Operazioni comuni per la gestione e manutenzione dei dati
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button 
                  variant="outline" 
                  onClick={refreshData} 
                  disabled={loading}
                  className="h-auto p-4 flex-col gap-2"
                >
                  <RefreshCw className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} />
                  <div>
                    <div className="font-medium">Aggiorna Dati</div>
                    <div className="text-xs text-muted-foreground">Ricarica tutti i dati</div>
                  </div>
                </Button>

                <Button 
                  variant="secondary" 
                  onClick={recategorizeTransactions} 
                  disabled={loading}
                  className="h-auto p-4 flex-col gap-2"
                >
                  <Tag className="h-6 w-6" />
                  <div>
                    <div className="font-medium">Ricategorizza</div>
                    <div className="text-xs text-muted-foreground">Applica nuove regole</div>
                  </div>
                </Button>

                <Button 
                  variant="destructive" 
                  onClick={clearAllData} 
                  disabled={loading}
                  className="h-auto p-4 flex-col gap-2"
                >
                  <Trash2 className="h-6 w-6" />
                  <div>
                    <div className="font-medium">Elimina Tutto</div>
                    <div className="text-xs text-muted-foreground">Cancella tutti i dati</div>
                  </div>
                </Button>
              </div>

              {/* Additional Information */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Informazioni Azioni</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div><strong>Aggiorna Dati:</strong> Ricarica tutte le transazioni e statistiche dalla cache del server</div>
                  <div><strong>Ricategorizza:</strong> Applica le regole di categorizzazione correnti a tutte le transazioni esistenti</div>
                  <div><strong>Elimina Tutto:</strong> Rimuove definitivamente tutte le transazioni dal database (le categorie e regole vengono mantenute)</div>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="text-yellow-600">⚠️</div>
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800">Attenzione</div>
                    <div className="text-yellow-700">
                      L'eliminazione dei dati è permanente. Assicurati di aver creato un backup prima di procedere.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <DatabaseInfo />
        </TabsContent>
      </Tabs>

      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border p-6 rounded shadow-lg">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm">Elaborazione in corso...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}