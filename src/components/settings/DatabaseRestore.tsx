'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertTriangle, CheckCircle, FileText, Info, RefreshCw } from 'lucide-react';

interface RestoreResults {
  transactions: { inserted: number; duplicates: number };
  categories: { inserted: number; errors: number };
  rules: { inserted: number; errors: number };
}

interface BackupMetadata {
  version: string;
  created_at: string;
  total_transactions: number;
  date_range?: {
    from: string;
    to: string;
  };
}

export function DatabaseRestore() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResults, setRestoreResults] = useState<RestoreResults | null>(null);
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setError('Seleziona un file JSON di backup valido');
        return;
      }
      setSelectedFile(file);
      setError('');
      setRestoreResults(null);
      setBackupMetadata(null);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setError('Seleziona prima un file di backup');
      return;
    }

    setIsRestoring(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('replaceExisting', replaceExisting.toString());

      const response = await fetch('/api/database/restore', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setRestoreResults(data.results);
        setBackupMetadata(data.backup_metadata);
        setSuccess(data.message || 'Restore completato con successo');
        // File selection is preserved to allow user to see results
        // User can manually refresh the page or reset the form
        
      } else {
        setError(data.error || 'Errore durante il restore del database');
      }
    } catch (err) {
      console.error('Restore error:', err);
      setError('Errore di rete durante il restore');
    } finally {
      setIsRestoring(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setError('');
    setSuccess('');
    setRestoreResults(null);
    setBackupMetadata(null);
    setReplaceExisting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Restore Database
        </CardTitle>
        <CardDescription>
          Ripristina i tuoi dati da un file di backup precedentemente creato
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div>{success}</div>
                <div className="text-sm text-muted-foreground">
                  💡 Suggerimento: Aggiorna la pagina (F5) per vedere i dati aggiornati nelle altre sezioni dell'applicazione.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* File Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <h4 className="font-medium">File di Backup</h4>
          </div>
          
          <div className="grid gap-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 w-full"
              />
            </div>
            
            {selectedFile && (
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Dimensione: {Math.round(selectedFile.size / 1024)} KB
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Restore Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <h4 className="font-medium">Opzioni di Restore</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <input
                id="replaceExisting"
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded border-gray-300 mt-1"
              />
              <div>
                <label htmlFor="replaceExisting" className="font-medium text-sm">
                  Sostituisci Dati Esistenti
                </label>
                <p className="text-xs text-muted-foreground">
                  Se attivato, eliminerà tutte le transazioni esistenti prima del restore.
                  Altrimenti, aggiungerà i dati dal backup a quelli esistenti (evitando duplicati).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Alert for Replace Mode */}
        {replaceExisting && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attenzione:</strong> Questa operazione eliminerà TUTTE le transazioni esistenti 
              e le sostituirà con quelle del backup. Questa azione non può essere annullata.
            </AlertDescription>
          </Alert>
        )}

        {/* Restore Results */}
        {restoreResults && (
          <div className="space-y-4">
            <h4 className="font-medium">Risultati del Restore</h4>
            
            {backupMetadata && (
              <div className="p-3 bg-muted rounded-md">
                <h5 className="font-medium mb-2">Informazioni Backup</h5>
                <div className="text-sm space-y-1">
                  <div>Versione: {backupMetadata.version}</div>
                  <div>Creato: {new Date(backupMetadata.created_at).toLocaleString('it-IT')}</div>
                  <div>Transazioni: {backupMetadata.total_transactions}</div>
                  {backupMetadata.date_range && (
                    <div>
                      Periodo: {backupMetadata.date_range.from} → {backupMetadata.date_range.to}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-md">
                <h5 className="font-medium">Transazioni</h5>
                <div className="text-sm text-muted-foreground">
                  <div>✅ Inserite: {restoreResults.transactions.inserted}</div>
                  <div>⚠️ Duplicate: {restoreResults.transactions.duplicates}</div>
                </div>
              </div>
              
              <div className="p-3 border rounded-md">
                <h5 className="font-medium">Categorie</h5>
                <div className="text-sm text-muted-foreground">
                  <div>✅ Inserite: {restoreResults.categories.inserted}</div>
                  <div>❌ Errori: {restoreResults.categories.errors}</div>
                </div>
              </div>
              
              <div className="p-3 border rounded-md">
                <h5 className="font-medium">Regole</h5>
                <div className="text-sm text-muted-foreground">
                  <div>✅ Inserite: {restoreResults.rules.inserted}</div>
                  <div>❌ Errori: {restoreResults.rules.errors}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t flex gap-3">
          <Button 
            onClick={handleRestore} 
            disabled={!selectedFile || isRestoring}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isRestoring ? 'Ripristino in corso...' : 'Inizia Restore'}
          </Button>
          
          {success && (
            <Button 
              variant="secondary"
              onClick={() => window.location.reload()}
              disabled={isRestoring}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna Pagina
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={resetForm}
            disabled={isRestoring}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}