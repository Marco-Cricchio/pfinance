'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, RefreshCw, TrendingUp, Calendar, Activity, FileText } from 'lucide-react';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface DatabaseInfo {
  stats: {
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
  };
  totals: {
    transactions: number;
    categories: number;
    category_rules: number;
  };
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
  health: {
    hasTransactions: boolean;
    hasCategories: boolean;
    hasRules: boolean;
    dataConsistency: {
      transactionsWithValidDates: number;
      transactionsWithCategories: number;
      uncategorizedTransactions: number;
    };
  };
  insights: {
    category_distribution: Record<string, number>;
    monthly_stats: Record<string, { income: number; expenses: number; total: number }>;
    averages: {
      transactions_per_month: number;
    };
    data_quality: {
      transactions_with_valid_dates: number;
      categorized_percentage: number;
    };
  };
}

export function DatabaseInfo() {
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { isVisible, obfuscateAmount } = useAmountVisibility();

  const loadDatabaseInfo = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/database/info');
      const data = await response.json();
      
      if (response.ok) {
        setDatabaseInfo(data.database_info);
      } else {
        setError(data.error || 'Errore durante il caricamento delle informazioni');
      }
    } catch (err) {
      console.error('Database info error:', err);
      setError('Errore di rete durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Informazioni Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Caricamento...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Informazioni Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={loadDatabaseInfo} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Riprova
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!databaseInfo) return null;


  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('it-IT');
  };

  const getHealthBadge = (condition: boolean, label: string) => {
    return (
      <Badge variant={condition ? "default" : "secondary"}>
        {condition ? '✅' : '⚠️'} {label}
      </Badge>
    );
  };

  // Get top categories
  const topCategories = Object.entries(databaseInfo.insights.category_distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Informazioni Database
        </CardTitle>
        <CardDescription>
          Statistiche dettagliate e salute del database
        </CardDescription>
        <Button variant="outline" size="sm" onClick={loadDatabaseInfo} className="w-fit">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <FileText className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{databaseInfo.totals.transactions}</div>
            <div className="text-xs text-muted-foreground">Transazioni</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{obfuscateAmount(databaseInfo.stats.totalIncome)}</div>
            <div className="text-xs text-muted-foreground">Entrate</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-red-500 rotate-180" />
            <div className="text-2xl font-bold">{obfuscateAmount(databaseInfo.stats.totalExpenses)}</div>
            <div className="text-xs text-muted-foreground">Spese</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Activity className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <div className={`text-2xl font-bold ${databaseInfo.stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {obfuscateAmount(databaseInfo.stats.netFlow)}
            </div>
            <div className="text-xs text-muted-foreground">Saldo Netto</div>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Periodo Dati</span>
          </div>
          <div className="text-sm">
            {formatDate(databaseInfo.date_range.earliest)} → {formatDate(databaseInfo.date_range.latest)}
          </div>
        </div>

        {/* Health Status */}
        <div className="space-y-3">
          <h4 className="font-medium">Stato Database</h4>
          <div className="flex flex-wrap gap-2">
            {getHealthBadge(databaseInfo.health.hasTransactions, 'Ha Transazioni')}
            {getHealthBadge(databaseInfo.health.hasCategories, 'Ha Categorie')}
            {getHealthBadge(databaseInfo.health.hasRules, 'Ha Regole')}
            {getHealthBadge(
              databaseInfo.insights.data_quality.categorized_percentage >= 80, 
              `${databaseInfo.insights.data_quality.categorized_percentage.toFixed(1)}% Categorizzate`
            )}
          </div>
        </div>

        {/* Data Quality */}
        <div className="space-y-3">
          <h4 className="font-medium">Qualità Dati</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 border rounded-md">
              <div className="font-medium">Date Valide</div>
              <div className="text-muted-foreground">
                {databaseInfo.insights.data_quality.transactions_with_valid_dates} / {databaseInfo.totals.transactions}
              </div>
            </div>
            <div className="p-3 border rounded-md">
              <div className="font-medium">Categorizzate</div>
              <div className="text-muted-foreground">
                {databaseInfo.health.dataConsistency.transactionsWithCategories} / {databaseInfo.totals.transactions}
              </div>
            </div>
            <div className="p-3 border rounded-md">
              <div className="font-medium">Senza Categoria</div>
              <div className="text-muted-foreground">
                {databaseInfo.health.dataConsistency.uncategorizedTransactions}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="space-y-3">
          <h4 className="font-medium">Configurazione</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 border rounded-md">
              <div className="font-medium">Categorie</div>
              <div className="text-muted-foreground">{databaseInfo.totals.categories} configurate</div>
            </div>
            <div className="p-3 border rounded-md">
              <div className="font-medium">Regole Auto-categorizzazione</div>
              <div className="text-muted-foreground">{databaseInfo.totals.category_rules} regole attive</div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Top Categorie (per numero transazioni)</h4>
            <div className="space-y-2">
              {topCategories.map(([category, count], index) => (
                <div key={category} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded text-xs flex items-center justify-center bg-primary text-primary-foreground">
                      {index + 1}
                    </div>
                    <span className="font-medium">{category}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {count} transazioni
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Insights */}
        <div className="space-y-3">
          <h4 className="font-medium">Performance</h4>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm space-y-1">
              <div>📊 Media transazioni/mese: {databaseInfo.insights.averages.transactions_per_month.toFixed(1)}</div>
              <div>🗓️ Mesi con dati: {Object.keys(databaseInfo.insights.monthly_stats).length}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}