'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Calendar, Database } from 'lucide-react';

interface BackupOptions {
  startDate: string;
  endDate: string;
  includeCategories: boolean;
  includeRules: boolean;
}

export function DatabaseBackup() {
  const [options, setOptions] = useState<BackupOptions>({
    startDate: '',
    endDate: '',
    includeCategories: true,
    includeRules: true
  });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    
    try {
      const response = await fetch('/api/database/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (response.ok) {
        // Get the backup data as blob
        const blob = await response.blob();
        
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'pfinance_backup.json';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
      } else {
        const errorData = await response.json();
        alert(`Errore durante la creazione del backup: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Backup error:', error);
      alert('Errore di rete durante la creazione del backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const resetDateRange = () => {
    setOptions(prev => ({
      ...prev,
      startDate: '',
      endDate: ''
    }));
  };

  const setLastNMonths = (months: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    setOptions(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Backup Database
        </CardTitle>
        <CardDescription>
          Crea un backup completo dei tuoi dati finanziari con opzioni di filtro per periodo temporale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <h4 className="font-medium">Periodo Temporale</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data Inizio</Label>
              <Input
                id="startDate"
                type="date"
                value={options.startDate}
                onChange={(e) => setOptions(prev => ({...prev, startDate: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Fine</Label>
              <Input
                id="endDate"
                type="date"
                value={options.endDate}
                onChange={(e) => setOptions(prev => ({...prev, endDate: e.target.value}))}
              />
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLastNMonths(1)}
            >
              Ultimo Mese
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLastNMonths(3)}
            >
              Ultimi 3 Mesi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLastNMonths(6)}
            >
              Ultimi 6 Mesi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLastNMonths(12)}
            >
              Ultimo Anno
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetDateRange}
            >
              Tutti i Dati
            </Button>
          </div>

          {options.startDate || options.endDate ? (
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
              📅 Backup periodo:{' '}
              {options.startDate || 'inizio'} → {options.endDate || 'fine'}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
              📊 Backup completo di tutti i dati
            </div>
          )}
        </div>

        {/* Data Inclusion Options */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <h4 className="font-medium">Contenuto del Backup</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                id="includeCategories"
                type="checkbox"
                checked={options.includeCategories}
                onChange={(e) => setOptions(prev => ({...prev, includeCategories: e.target.checked}))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="includeCategories">Includi Categorie</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="includeRules"
                type="checkbox"
                checked={options.includeRules}
                onChange={(e) => setOptions(prev => ({...prev, includeRules: e.target.checked}))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="includeRules">Includi Regole di Categorizzazione</Label>
            </div>
          </div>
        </div>

        {/* Create Backup Button */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleCreateBackup} 
            disabled={isCreatingBackup}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isCreatingBackup ? 'Creazione Backup...' : 'Crea Backup'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}