'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ReferenceLine } from 'recharts';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

// Il campo date ora contiene già la data valuta

interface BudgetForecastCardProps {
  transactions: Transaction[];
}

interface MonthlyData {
  month: string;
  monthKey: string;
  income: number;
  expenses: number;
  balance: number;
  isProjected: boolean;
}

interface CategoryForecast {
  category: string;
  currentMonthly: number;
  projectedMonthly: number;
  trend: number;
  confidence: number;
}

interface ForecastSummary {
  nextMonthProjection: {
    income: number;
    expenses: number;
    balance: number;
  };
  next3MonthsAverage: {
    income: number;
    expenses: number;
    balance: number;
  };
  budgetRecommendations: Array<{
    category: string;
    currentSpend: number;
    recommendedBudget: number;
    reasoning: string;
  }>;
}

export function BudgetForecastCard({ transactions }: BudgetForecastCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'categories' | 'recommendations'>('overview');
  const [forecastMonths, setForecastMonths] = useState(3);
  const { obfuscateAmount } = useAmountVisibility();

  const forecastData = useMemo(() => {
    if (!transactions.length) return { 
      monthlyData: [], 
      categoryForecasts: [], 
      forecastSummary: null 
    };

    // Raggruppa transazioni per mese
    const monthlyGroups: Record<string, { income: number; expenses: number; month: string }> = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { income: 0, expenses: 0, month: monthLabel };
      }
      
      if (transaction.type === 'income') {
        monthlyGroups[monthKey].income += transaction.amount;
      } else {
        monthlyGroups[monthKey].expenses += transaction.amount;
      }
    });

    // Converte in array e ordina
    const historicalData = Object.entries(monthlyGroups)
      .map(([monthKey, data]) => ({
        month: data.month,
        monthKey,
        income: data.income,
        expenses: data.expenses,
        balance: data.income - data.expenses,
        isProjected: false
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Esclude il mese corrente dai calcoli
    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Filtra i dati storici escludendo il mese corrente
    const historicalDataExcludingCurrent = historicalData.filter(month => month.monthKey !== currentMonthKey);
    
    if (historicalDataExcludingCurrent.length < 2) {
      return { monthlyData: historicalData, categoryForecasts: [], forecastSummary: null };
    }

    // Prende gli ultimi 3 mesi (escludendo quello corrente)
    const last3Months = historicalDataExcludingCurrent.slice(-3);
    const avgIncome = last3Months.reduce((sum, month) => sum + month.income, 0) / last3Months.length;
    const avgExpenses = last3Months.reduce((sum, month) => sum + month.expenses, 0) / last3Months.length;
    
    // Arrotonda a 2 decimali la media semplice degli ultimi 3 mesi (escluso mese corrente)
    const simpleIncomeAverage = Math.round(avgIncome * 100) / 100;
    const simpleExpenseAverage = Math.round(avgExpenses * 100) / 100;

    // NUOVA LOGICA SEMPLICE: usa solo la media degli ultimi 3 mesi
    // Nessun trend, solo media diretta
    
    // Genera proiezioni future
    const projectedData: MonthlyData[] = [];
    const lastMonth = new Date(historicalData[historicalData.length - 1].monthKey + '-01');
    
    for (let i = 1; i <= forecastMonths; i++) {
      const projectedMonth = new Date(lastMonth);
      projectedMonth.setMonth(projectedMonth.getMonth() + i);
      
      // Usa semplicemente la media degli ultimi 3 mesi per ogni proiezione (già arrotondata)
      const projectedIncome = simpleIncomeAverage;
      const projectedExpenses = simpleExpenseAverage;
      const projectedBalance = Math.round((projectedIncome - projectedExpenses) * 100) / 100;
      
      projectedData.push({
        month: projectedMonth.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
        monthKey: `${projectedMonth.getFullYear()}-${String(projectedMonth.getMonth() + 1).padStart(2, '0')}`,
        income: projectedIncome,
        expenses: projectedExpenses,
        balance: projectedBalance,
        isProjected: true
      });
    }

    const monthlyData = [...historicalData, ...projectedData];

    // Forecast per categoria
    const categoryData: Record<string, Transaction[]> = {};
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const category = transaction.category || 'Altro';
      if (!categoryData[category]) categoryData[category] = [];
      categoryData[category].push(transaction);
    });

    const categoryForecasts: CategoryForecast[] = Object.entries(categoryData).map(([category, txns]) => {
      const monthlyAmounts: Record<string, number> = {};
      
      txns.forEach(txn => {
        const monthKey = new Date(txn.date).toISOString().substring(0, 7);
        monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] || 0) + txn.amount;
      });

      const amounts = Object.values(monthlyAmounts);
      const currentMonthly = Math.round((amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length) * 100) / 100;
      
      // Calcola trend
      const recent = amounts.slice(-3);
      const older = amounts.slice(-6, -3);
      const recentAvg = recent.reduce((sum, amt) => sum + amt, 0) / recent.length;
      const olderAvg = older.reduce((sum, amt) => sum + amt, 0) / older.length || recentAvg;
      const trend = (recentAvg - olderAvg) / olderAvg;
      
      const projectedMonthly = Math.round(Math.max(0, currentMonthly * (1 + trend)) * 100) / 100;
      const confidence = Math.round(Math.max(0.3, Math.min(1, amounts.length / 6)) * 100) / 100; // Più dati = più confidenza

      return {
        category,
        currentMonthly,
        projectedMonthly,
        trend: Math.round(trend * 10000) / 10000, // 4 decimali per il trend
        confidence
      };
    }).sort((a, b) => b.projectedMonthly - a.projectedMonthly);

    // Summary e raccomandazioni  
    const nextMonth = projectedData[0];
    const next3MonthsAverage = {
      income: simpleIncomeAverage, // Stessa media per tutti i mesi futuri (già arrotondata)
      expenses: simpleExpenseAverage, // Stessa media per tutti i mesi futuri (già arrotondata)
      balance: Math.round((simpleIncomeAverage - simpleExpenseAverage) * 100) / 100
    };

    const budgetRecommendations = categoryForecasts.slice(0, 5).map(cat => {
      const recommendedBudget = cat.trend > 0.1 ? 
        Math.round(cat.currentMonthly * 1.1 * 100) / 100 : // Incrementa se in crescita
        Math.round(cat.currentMonthly * 0.95 * 100) / 100; // Riduci leggermente se stabile/decrescente
        
      const reasoning = cat.trend > 0.2 ? 
        'Categoria in crescita rapida - considera di aumentare il budget' :
        cat.trend > 0.05 ?
        'Leggera crescita - budget raccomandato aumentato del 10%' :
        cat.trend < -0.1 ?
        'Spese in calo - possibilità di ridurre il budget' :
        'Spese stabili - mantieni il budget attuale con piccole ottimizzazioni';

      return {
        category: cat.category,
        currentSpend: Math.round(cat.currentMonthly * 100) / 100,
        recommendedBudget,
        reasoning
      };
    });

    const forecastSummary: ForecastSummary = {
      nextMonthProjection: {
        income: nextMonth.income,
        expenses: nextMonth.expenses,
        balance: nextMonth.balance
      },
      next3MonthsAverage,
      budgetRecommendations
    };
    

    return { monthlyData, categoryForecasts, forecastSummary };
  }, [transactions, forecastMonths]);

  const getBalanceColor = (balance: number) => {
    return balance >= 0 ? '#22c55e' : '#ef4444';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0.05) return <TrendingUp className="h-4 w-4 text-red-400" />;
    if (trend < -0.05) return <TrendingDown className="h-4 w-4 text-green-400" />;
    return <Target className="h-4 w-4 text-blue-400" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              Previsioni Budget
            </CardTitle>
            <CardDescription>
              Proiezioni intelligenti basate sui tuoi pattern di spesa storici
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={forecastMonths} 
              onChange={(e) => setForecastMonths(Number(e.target.value))}
              className="text-sm bg-slate-800 border border-slate-600 rounded px-2 py-1"
            >
              <option value={1}>1 mese</option>
              <option value={3}>3 mesi</option>
              <option value={6}>6 mesi</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {forecastData.forecastSummary && (
          <>
            {/* Statistiche chiave */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
                <div className="text-2xl font-bold text-blue-100">
                  {obfuscateAmount(forecastData.forecastSummary.nextMonthProjection.income)}
                </div>
                <div className="text-sm text-blue-200 mt-1">Entrate Previste</div>
                <div className="text-xs text-blue-300">Prossimo Mese</div>
              </div>
              <div className="text-center p-4 bg-orange-900/20 border border-orange-600 rounded-lg">
                <div className="text-2xl font-bold text-orange-100">
                  {obfuscateAmount(forecastData.forecastSummary.nextMonthProjection.expenses)}
                </div>
                <div className="text-sm text-orange-200 mt-1">Spese Previste</div>
                <div className="text-xs text-orange-300">Prossimo Mese</div>
              </div>
              <div className={`text-center p-4 rounded-lg ${forecastData.forecastSummary.nextMonthProjection.balance >= 0 ? 'bg-green-900/20 border-green-600' : 'bg-red-900/20 border-red-600'}`}>
                <div className={`text-2xl font-bold ${forecastData.forecastSummary.nextMonthProjection.balance >= 0 ? 'text-green-100' : 'text-red-100'}`}>
                  {obfuscateAmount(Math.abs(forecastData.forecastSummary.nextMonthProjection.balance))}
                </div>
                <div className={`text-sm mt-1 ${forecastData.forecastSummary.nextMonthProjection.balance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {forecastData.forecastSummary.nextMonthProjection.balance >= 0 ? 'Surplus Previsto' : 'Deficit Previsto'}
                </div>
                <div className={`text-xs ${forecastData.forecastSummary.nextMonthProjection.balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  Prossimo Mese
                </div>
              </div>
            </div>

            {/* Toggle visualizzazione */}
            <div className="flex justify-center gap-2">
              <Button
                variant={viewMode === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('overview')}
              >
                Panoramica
              </Button>
              <Button
                variant={viewMode === 'categories' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('categories')}
              >
                Per Categoria
              </Button>
              <Button
                variant={viewMode === 'recommendations' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('recommendations')}
              >
                Raccomandazioni
              </Button>
            </div>

            {/* Grafici */}
            <div className={`${expanded ? 'h-96' : 'h-80'}`}>
              {viewMode === 'overview' && forecastData.monthlyData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData.monthlyData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={12}
                      tickFormatter={(value) => {
                        const testResult = obfuscateAmount(1000);
                        const isVisible = !testResult.includes('●');
                        if (isVisible) {
                          return `€${(value / 1000).toFixed(0)}k`;
                        }
                        return '***k';
                      }}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const label = name === 'income' ? 'Entrate' : 
                                     name === 'expenses' ? 'Spese' : 'Bilancio';
                        const formattedValue = obfuscateAmount(Number(value));
                        return [formattedValue, label];
                      }}
                      labelFormatter={(label, payload) => {
                        const isProjected = payload?.[0]?.payload?.isProjected;
                        return `${label} ${isProjected ? '(Proiezione)' : ''}`;
                      }}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <ReferenceLine 
                      x={forecastData.monthlyData.find(m => !m.isProjected)?.month} 
                      stroke="#8b5cf6" 
                      strokeDasharray="2 2" 
                    />
                    <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#incomeGradient)" name="income" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expenseGradient)" name="expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {viewMode === 'overview' && forecastData.monthlyData.length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <span className="text-4xl block mb-2">📈</span>
                    <p>Dati insufficienti per le previsioni</p>
                    <p className="text-xs mt-1">Servono almeno 2 mesi di storico</p>
                  </div>
                </div>
              )}

              {viewMode === 'categories' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastData.categoryForecasts.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#9ca3af" 
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={12}
                      tickFormatter={(value) => {
                        const testResult = obfuscateAmount(1000);
                        const isVisible = !testResult.includes('●');
                        if (isVisible) {
                          return `€${(value / 1000).toFixed(0)}k`;
                        }
                        return '***k';
                      }}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const label = name === 'currentMonthly' ? 'Spesa Attuale' : 'Spesa Prevista';
                        const formattedValue = obfuscateAmount(Number(value));
                        return [formattedValue, label];
                      }}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <Bar dataKey="currentMonthly" fill="#6b7280" name="currentMonthly" />
                    <Bar dataKey="projectedMonthly" fill="#8b5cf6" name="projectedMonthly" />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {viewMode === 'recommendations' && (
                <div className="space-y-3 max-h-full overflow-y-auto">
                  <h5 className="font-medium text-slate-200">Raccomandazioni Budget</h5>
                  {forecastData.forecastSummary.budgetRecommendations.map((rec, index) => (
                    <div key={rec.category} className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                          <span className="font-medium text-slate-200">{rec.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-300">
                            {obfuscateAmount(rec.currentSpend)} → {obfuscateAmount(rec.recommendedBudget)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {rec.recommendedBudget > rec.currentSpend ? '+' : ''}
                            {((rec.recommendedBudget - rec.currentSpend) / rec.currentSpend * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{rec.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alert per deficit previsto */}
            {forecastData.forecastSummary.nextMonthProjection.balance < 0 && (
              <div className="bg-red-900/20 border border-red-600 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h5 className="font-medium text-red-200">Attenzione: Deficit Previsto</h5>
                </div>
                <p className="text-sm text-red-300">
                  Le proiezioni indicano un deficit di {obfuscateAmount(Math.abs(forecastData.forecastSummary.nextMonthProjection.balance))} per il prossimo mese. 
                  Considera di rivedere le spese nelle categorie principali.
                </p>
              </div>
            )}
          </>
        )}

        {!forecastData.forecastSummary && (
          <div className="text-center text-slate-400 py-8">
            <span className="text-4xl block mb-2">📊</span>
            <p>Dati insufficienti per generare previsioni</p>
            <p className="text-sm">Servono almeno 2 mesi di dati storici</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}