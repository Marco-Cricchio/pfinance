'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

// Il campo date ora contiene già la data valuta

interface CashFlowAnalysisCardProps {
  transactions: Transaction[];
  currentAccountBalance?: number;
}

interface CashFlowData {
  month: string;
  monthKey: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  incomeSources: number;
  expenseCategories: number;
}

interface CashFlowMetrics {
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageNetCashFlow: number;
  cashFlowVolatility: number;
  positiveMonths: number;
  negativeMonths: number;
  longestPositiveStreak: number;
  longestNegativeStreak: number;
  burnRate: number; // Mesi di autonomia con le riserve attuali
  survivalWithTrend: number; // Mesi prima che il saldo arrivi a 0 con trend attuale
  survivalNoIncome: number; // Mesi prima che il saldo arrivi a 0 senza entrate
  recoveryMonths: number; // Mesi per recuperare da una spesa imprevista
  monthsToDouble: number; // Mesi per raddoppiare il saldo con trend positivo
}

interface CashFlowPattern {
  type: 'seasonal' | 'growth' | 'decline' | 'volatile' | 'stable';
  confidence: number;
  description: string;
}

export function CashFlowAnalysisCard({ transactions, currentAccountBalance }: CashFlowAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'flow' | 'cumulative' | 'patterns'>('flow');
  const { obfuscateAmount } = useAmountVisibility();

  const cashFlowAnalysis = useMemo(() => {
    if (!transactions.length) return { 
      cashFlowData: [], 
      metrics: null, 
      patterns: [], 
      recommendations: [] 
    };

    // Raggruppa transazioni per mese
    const monthlyGroups: Record<string, {
      income: Transaction[];
      expenses: Transaction[];
    }> = {};

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { income: [], expenses: [] };
      }
      
      if (transaction.type === 'income') {
        monthlyGroups[monthKey].income.push(transaction);
      } else {
        monthlyGroups[monthKey].expenses.push(transaction);
      }
    });

    // Costruisce i dati di cash flow
    let cumulativeCashFlow = 0;
    const cashFlowData: CashFlowData[] = Object.entries(monthlyGroups)
      .map(([monthKey, data]) => {
        const date = new Date(monthKey + '-01');
        const month = date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
        
        const income = data.income.reduce((sum, t) => sum + t.amount, 0);
        const expenses = data.expenses.reduce((sum, t) => sum + t.amount, 0);
        const netCashFlow = income - expenses;
        cumulativeCashFlow += netCashFlow;
        
        // Conta fonti di reddito e categorie di spesa uniche
        const incomeSources = new Set(data.income.map(t => t.category || 'Altro')).size;
        const expenseCategories = new Set(data.expenses.map(t => t.category || 'Altro')).size;

        return {
          month,
          monthKey,
          income,
          expenses,
          netCashFlow,
          cumulativeCashFlow,
          incomeSources,
          expenseCategories
        };
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    if (!cashFlowData.length) {
      return { cashFlowData: [], metrics: null, patterns: [], recommendations: [] };
    }

    // Calcola metriche
    const netCashFlows = cashFlowData.map(d => d.netCashFlow);
    const incomes = cashFlowData.map(d => d.income);
    const expenses = cashFlowData.map(d => d.expenses);

    const averageMonthlyIncome = incomes.reduce((sum, inc) => sum + inc, 0) / incomes.length;
    const averageMonthlyExpenses = expenses.reduce((sum, exp) => sum + exp, 0) / expenses.length;
    const averageNetCashFlow = netCashFlows.reduce((sum, net) => sum + net, 0) / netCashFlows.length;

    // Volatilità (deviazione standard del cash flow netto)
    const variance = netCashFlows.reduce((sum, flow) => sum + Math.pow(flow - averageNetCashFlow, 2), 0) / netCashFlows.length;
    const cashFlowVolatility = Math.sqrt(variance);

    const positiveMonths = netCashFlows.filter(flow => flow > 0).length;
    const negativeMonths = netCashFlows.filter(flow => flow < 0).length;

    // Calcola streak più lunghi
    let currentPositiveStreak = 0;
    let currentNegativeStreak = 0;
    let longestPositiveStreak = 0;
    let longestNegativeStreak = 0;

    netCashFlows.forEach(flow => {
      if (flow > 0) {
        currentPositiveStreak++;
        currentNegativeStreak = 0;
        longestPositiveStreak = Math.max(longestPositiveStreak, currentPositiveStreak);
      } else if (flow < 0) {
        currentNegativeStreak++;
        currentPositiveStreak = 0;
        longestNegativeStreak = Math.max(longestNegativeStreak, currentNegativeStreak);
      } else {
        currentPositiveStreak = 0;
        currentNegativeStreak = 0;
      }
    });

    // Use real account balance if provided, otherwise use cumulative cash flow
    const actualBalance = currentAccountBalance !== undefined ? currentAccountBalance : cumulativeCashFlow;

    // Calcoli per i 3 mesi PRECEDENTI all'ultimo mese disponibile nei dati
    // Se l'ultimo mese è settembre, usiamo giugno, luglio, agosto
    const reference3MonthsData = cashFlowData.length > 3 ? 
      cashFlowData.slice(-4, -1) : // Prende i 3 mesi prima dell'ultimo
      cashFlowData.slice(0, -1); // Se abbiamo meno di 4 mesi, prende tutto tranne l'ultimo
    
    // Se non abbiamo abbastanza dati storici, usa gli ultimi 3 mesi come fallback
    const finalReference3Months = reference3MonthsData.length > 0 ? reference3MonthsData : cashFlowData.slice(-3);
    
    // Calcola medie dei 3 mesi di riferimento
    const last3MonthsIncome = finalReference3Months.length > 0 ? 
      finalReference3Months.reduce((sum, month) => sum + month.income, 0) / finalReference3Months.length : averageMonthlyIncome;
    const last3MonthsExpenses = finalReference3Months.length > 0 ? 
      finalReference3Months.reduce((sum, month) => sum + month.expenses, 0) / finalReference3Months.length : averageMonthlyExpenses;
    
    // Calcola burnRate usando gli ultimi 3 mesi di spese nette (non solo spese totali)  
    // Il burnRate dovrebbe considerare le spese nette (spese - entrate) se negative, altrimenti solo le spese
    const netExpenseRate = Math.max(0, last3MonthsExpenses - last3MonthsIncome); // Solo se il bilancio è negativo
    const burnRate = netExpenseRate > 0 ? Math.max(0, actualBalance / netExpenseRate) : Infinity;
    const last3MonthsNetCashFlow = last3MonthsIncome - last3MonthsExpenses;

    // Scenario 1: Sopravvivenza con trend attuale
    let survivalWithTrend = Infinity;
    if (last3MonthsNetCashFlow < 0 && actualBalance > 0) {
      survivalWithTrend = actualBalance / Math.abs(last3MonthsNetCashFlow);
    } else if (last3MonthsNetCashFlow >= 0) {
      survivalWithTrend = Infinity; // Trend positivo = mai arriva a 0
    } else {
      survivalWithTrend = 0; // Saldo già a zero o negativo
    }

    // Scenario 2: Sopravvivenza senza entrate (solo con spese attuali)
    let survivalNoIncome = 0;
    if (last3MonthsExpenses > 0 && actualBalance > 0) {
      survivalNoIncome = actualBalance / last3MonthsExpenses;
    } else if (last3MonthsExpenses <= 0) {
      survivalNoIncome = Infinity; // Nessuna spesa
    } else {
      survivalNoIncome = 0; // Saldo già a zero o negativo
    }

    // Scenario 3: Mesi di recupero per spesa imprevista (€5000)
    const emergencyAmount = 5000;
    let recoveryMonths = Infinity;
    if (last3MonthsNetCashFlow > 0) {
      recoveryMonths = emergencyAmount / last3MonthsNetCashFlow;
    } else {
      recoveryMonths = Infinity; // Cash flow non positivo, impossibile recuperare
    }

    // Scenario 4: Mesi per raddoppiare il saldo
    let monthsToDouble = Infinity;
    if (last3MonthsNetCashFlow > 0 && actualBalance > 0) {
      monthsToDouble = actualBalance / last3MonthsNetCashFlow; // Tempo per raddoppiare
    } else {
      monthsToDouble = Infinity; // Cash flow non positivo, impossibile raddoppiare
    }

    const metrics: CashFlowMetrics = {
      averageMonthlyIncome,
      averageMonthlyExpenses,
      averageNetCashFlow,
      cashFlowVolatility,
      positiveMonths,
      negativeMonths,
      longestPositiveStreak,
      longestNegativeStreak,
      burnRate,
      survivalWithTrend,
      survivalNoIncome,
      recoveryMonths,
      monthsToDouble
    };

    // Identifica pattern
    const patterns: CashFlowPattern[] = [];

    // Pattern di crescita/declino
    if (netCashFlows.length >= 3) {
      const firstThird = netCashFlows.slice(0, Math.floor(netCashFlows.length / 3));
      const lastThird = netCashFlows.slice(-Math.floor(netCashFlows.length / 3));
      
      const firstAvg = firstThird.reduce((sum, f) => sum + f, 0) / firstThird.length;
      const lastAvg = lastThird.reduce((sum, f) => sum + f, 0) / lastThird.length;
      
      const change = (lastAvg - firstAvg) / Math.abs(firstAvg) || 0;
      
      if (change > 0.2) {
        patterns.push({
          type: 'growth',
          confidence: Math.min(1, Math.abs(change)),
          description: `Trend di crescita: cash flow migliorato del ${(change * 100).toFixed(0)}% nel periodo`
        });
      } else if (change < -0.2) {
        patterns.push({
          type: 'decline',
          confidence: Math.min(1, Math.abs(change)),
          description: `Trend di declino: cash flow peggiorato del ${(Math.abs(change) * 100).toFixed(0)}% nel periodo`
        });
      }
    }

    // Pattern di volatilità
    const coefficientOfVariation = Math.abs(averageNetCashFlow) > 0 ? cashFlowVolatility / Math.abs(averageNetCashFlow) : 0;
    if (coefficientOfVariation > 0.5) {
      patterns.push({
        type: 'volatile',
        confidence: Math.min(1, coefficientOfVariation),
        description: 'Cash flow molto volatile - entrate e uscite irregolari'
      });
    } else if (coefficientOfVariation < 0.2) {
      patterns.push({
        type: 'stable',
        confidence: 1 - coefficientOfVariation,
        description: 'Cash flow stabile con variazioni minime mese su mese'
      });
    }

    // Pattern stagionale (semplificato)
    if (cashFlowData.length >= 12) {
      const monthlyAverages = new Array(12).fill(0);
      const monthCounts = new Array(12).fill(0);
      
      cashFlowData.forEach(data => {
        const month = new Date(data.monthKey + '-01').getMonth();
        monthlyAverages[month] += data.netCashFlow;
        monthCounts[month]++;
      });
      
      for (let i = 0; i < 12; i++) {
        if (monthCounts[i] > 0) {
          monthlyAverages[i] /= monthCounts[i];
        }
      }
      
      const maxMonthly = Math.max(...monthlyAverages);
      const minMonthly = Math.min(...monthlyAverages);
      const seasonalVariation = (maxMonthly - minMonthly) / Math.abs(averageNetCashFlow) || 0;
      
      if (seasonalVariation > 0.3) {
        patterns.push({
          type: 'seasonal',
          confidence: Math.min(1, seasonalVariation),
          description: 'Pattern stagionale rilevato - cash flow varia significativamente durante l\'anno'
        });
      }
    }

    // Raccomandazioni
    const recommendations = [];
    
    if (metrics.averageNetCashFlow < 0) {
      recommendations.push({
        type: 'warning',
        title: 'Cash Flow Negativo',
        description: 'Il tuo cash flow medio è negativo. Considera di ridurre le spese o aumentare le entrate.',
        priority: 'high'
      });
    } else if (metrics.averageNetCashFlow > 0 && metrics.burnRate === Infinity) {
      recommendations.push({
        type: 'success',
        title: 'Situazione Finanziaria Positiva',
        description: 'Il tuo cash flow è positivo. Le tue entrate superano le spese mensili, permettendo accumulo di risparmio.',
        priority: 'low'
      });
    }
    
    if (metrics.burnRate < 6 && metrics.burnRate > 0 && metrics.burnRate !== Infinity) {
      const monthsText = metrics.burnRate.toFixed(1);
      const burnRateMessage = metrics.burnRate < 3 
        ? `Situazione critica: con il trend negativo attuale, le riserve dureranno solo ${monthsText} mesi.`
        : `Con il trend negativo attuale, le riserve dureranno circa ${monthsText} mesi.`;
      
      recommendations.push({
        type: 'warning',
        title: 'Attenzione al Cash Flow Negativo',
        description: burnRateMessage,
        priority: metrics.burnRate < 3 ? 'high' : 'medium'
      });
    }
    
    if (coefficientOfVariation > 0.5) {
      recommendations.push({
        type: 'info',
        title: 'Cash Flow Volatile',
        description: 'Il tuo cash flow è molto variabile. Considera di creare un budget più stabile.',
        priority: 'medium'
      });
    }
    
    if (metrics.longestNegativeStreak > 2) {
      recommendations.push({
        type: 'warning',
        title: 'Periodo Negativo Prolungato',
        description: `Hai avuto ${metrics.longestNegativeStreak} mesi consecutivi di cash flow negativo.`,
        priority: 'medium'
      });
    }

    return { cashFlowData, metrics, patterns, recommendations };
  }, [transactions]);

  const getCashFlowColor = (value: number) => {
    return value >= 0 ? '#22c55e' : '#ef4444';
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'growth': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'decline': return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'volatile': return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'stable': return <DollarSign className="h-4 w-4 text-blue-400" />;
      case 'seasonal': return <Calendar className="h-4 w-4 text-purple-400" />;
      default: return <DollarSign className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              Analisi Cash Flow
            </CardTitle>
            <CardDescription>
              Analizza il flusso di cassa per ottimizzare la gestione finanziaria
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {cashFlowAnalysis.metrics && (
          <>
            {/* Metriche principali */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
                <div className="text-2xl font-bold text-blue-100">
                  {obfuscateAmount(cashFlowAnalysis.metrics.averageMonthlyIncome)}
                </div>
                <div className="text-xs text-blue-200 mt-1">Entrate Medie</div>
              </div>
              <div className="text-center p-3 bg-red-900/20 border border-red-600 rounded-lg">
                <div className="text-2xl font-bold text-red-100">
                  {obfuscateAmount(cashFlowAnalysis.metrics.averageMonthlyExpenses)}
                </div>
                <div className="text-xs text-red-200 mt-1">Spese Medie</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${cashFlowAnalysis.metrics.averageNetCashFlow >= 0 ? 'bg-green-900/20 border-green-600' : 'bg-red-900/20 border-red-600'}`}>
                <div className={`text-2xl font-bold ${cashFlowAnalysis.metrics.averageNetCashFlow >= 0 ? 'text-green-100' : 'text-red-100'}`}>
                  {obfuscateAmount(Math.abs(cashFlowAnalysis.metrics.averageNetCashFlow))}
                </div>
                <div className={`text-xs mt-1 ${cashFlowAnalysis.metrics.averageNetCashFlow >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  Cash Flow Medio
                </div>
              </div>
            </div>

            {/* Nuove metriche di sopravvivenza */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-orange-900/20 border border-orange-600 rounded-lg">
                <div className="text-2xl font-bold text-orange-100">
                  {cashFlowAnalysis.metrics.survivalWithTrend === Infinity ? '∞' : (
                    obfuscateAmount(1000).includes('●') ? '●●.●' : cashFlowAnalysis.metrics.survivalWithTrend.toFixed(1)
                  )}
                </div>
                <div className="text-xs text-orange-200 mt-1">
                  # Mesi prima di Bilancio = 0 con Trend Attuale
                </div>
                <div className="text-xs text-orange-300 mt-1">
                  {cashFlowAnalysis.metrics && cashFlowAnalysis.cashFlowData.length > 0 ? 
                    ((cashFlowAnalysis.cashFlowData.slice(-3).reduce((sum, month) => sum + (month.income - month.expenses), 0) / Math.min(3, cashFlowAnalysis.cashFlowData.length)) < 0 
                      ? "Con trend negativo attuale" 
                      : "")
                    : "Prima che il saldo arrivi a 0"
                  }
                </div>
              </div>
              <div className="text-center p-3 bg-red-900/20 border border-red-600 rounded-lg">
                <div className="text-2xl font-bold text-red-100">
                  {cashFlowAnalysis.metrics.survivalNoIncome === Infinity ? '∞' : (
                    obfuscateAmount(1000).includes('●') ? '●●.●' : cashFlowAnalysis.metrics.survivalNoIncome.toFixed(1)
                  )}
                </div>
                <div className="text-xs text-red-200 mt-1">
                  # Mesi prima di Bilancio = 0 Senza Entrate
                </div>
              </div>
              <div className="text-center p-3 bg-green-900/20 border border-green-600 rounded-lg">
                <div className="text-2xl font-bold text-green-100">
                  {cashFlowAnalysis.metrics.monthsToDouble === Infinity ? '∞' : (
                    obfuscateAmount(1000).includes('●') ? '●●.●' : cashFlowAnalysis.metrics.monthsToDouble.toFixed(1)
                  )}
                </div>
                <div className="text-xs text-green-200 mt-1">
                  Mesi per Raddoppiare
                </div>
                <div className="text-xs text-green-300 mt-1">
                  {cashFlowAnalysis.metrics && cashFlowAnalysis.cashFlowData.length > 0 ? 
                    ((cashFlowAnalysis.cashFlowData.slice(-3).reduce((sum, month) => sum + (month.income - month.expenses), 0) / Math.min(3, cashFlowAnalysis.cashFlowData.length)) > 0 
                      ? "Con trend positivo attuale" 
                      : "Trend negativo (impossibile)")
                    : "Il capitale attuale"
                  }
                </div>
              </div>
            </div>

            {/* Toggle visualizzazione */}
            <div className="flex justify-center gap-2">
              <Button
                variant={viewMode === 'flow' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('flow')}
              >
                Flusso Mensile
              </Button>
              <Button
                variant={viewMode === 'cumulative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cumulative')}
              >
                Cumulativo
              </Button>
              <Button
                variant={viewMode === 'patterns' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('patterns')}
              >
                Pattern
              </Button>
            </div>

            {/* Grafici */}
            <div className={`${expanded ? 'h-96' : 'h-80'}`}>
              {viewMode === 'flow' && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cashFlowAnalysis.cashFlowData}>
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
                        const labels = {
                          income: 'Entrate',
                          expenses: 'Spese',
                          netCashFlow: 'Cash Flow Netto'
                        };
                        const formattedValue = obfuscateAmount(Number(value));
                        return [formattedValue, labels[name as keyof typeof labels] || name];
                      }}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
                    <Bar dataKey="income" fill="#22c55e" name="income" />
                    <Bar dataKey="expenses" fill="#ef4444" name="expenses" />
                    <Line type="monotone" dataKey="netCashFlow" stroke="#8b5cf6" strokeWidth={3} name="netCashFlow" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {viewMode === 'cumulative' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowAnalysis.cashFlowData}>
                    <defs>
                      <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
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
                      formatter={(value) => {
                        const formattedValue = obfuscateAmount(Number(value));
                        return [formattedValue, 'Cash Flow Cumulativo'];
                      }}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
                    <Area type="monotone" dataKey="cumulativeCashFlow" stroke="#8b5cf6" fill="url(#cumulativeGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {viewMode === 'patterns' && (
                <div className="space-y-4 max-h-full overflow-y-auto">
                  {/* Pattern identificati */}
                  <div>
                    <h5 className="font-medium text-slate-200 mb-3">Pattern Identificati</h5>
                    <div className="space-y-2">
                      {cashFlowAnalysis.patterns.map((pattern, index) => (
                        <div key={index} className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {getPatternIcon(pattern.type)}
                            <span className="font-medium text-slate-200 capitalize">
                              {pattern.type.replace('_', ' ')}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {(pattern.confidence * 100).toFixed(0)}% confidenza
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400">{pattern.description}</p>
                        </div>
                      ))}
                      {cashFlowAnalysis.patterns.length === 0 && (
                        <p className="text-slate-400 text-sm">Nessun pattern significativo rilevato</p>
                      )}
                    </div>
                  </div>

                  {/* Statistiche aggiuntive */}
                  <div>
                    <h5 className="font-medium text-slate-200 mb-3">Statistiche Dettagliate</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
                        <div className="text-slate-300 font-medium">Mesi Positivi</div>
                        <div className="text-green-400 text-lg font-bold">
                          {cashFlowAnalysis.metrics.positiveMonths}/{cashFlowAnalysis.cashFlowData.length}
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
                        <div className="text-slate-300 font-medium">Mesi Negativi</div>
                        <div className="text-red-400 text-lg font-bold">
                          {cashFlowAnalysis.metrics.negativeMonths}/{cashFlowAnalysis.cashFlowData.length}
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
                        <div className="text-slate-300 font-medium">Streak Positivo Max</div>
                        <div className="text-blue-400 text-lg font-bold">
                          {cashFlowAnalysis.metrics.longestPositiveStreak} mesi
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
                        <div className="text-slate-300 font-medium">Volatilità</div>
                        <div className="text-yellow-400 text-lg font-bold">
                          {obfuscateAmount(cashFlowAnalysis.metrics.cashFlowVolatility)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Raccomandazioni */}
            {cashFlowAnalysis.recommendations.length > 0 && (
              <div>
                <h5 className="font-medium text-slate-200 mb-3">Raccomandazioni</h5>
                <div className="space-y-2">
                  {cashFlowAnalysis.recommendations.map((rec, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      rec.priority === 'high' ? 'bg-red-900/20 border-red-600' :
                      rec.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-600' :
                      rec.type === 'success' ? 'bg-green-900/20 border-green-600' :
                      'bg-blue-900/20 border-blue-600'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className={`h-4 w-4 ${
                          rec.priority === 'high' ? 'text-red-400' :
                          rec.priority === 'medium' ? 'text-yellow-400' :
                          rec.type === 'success' ? 'text-green-400' :
                          'text-blue-400'
                        }`} />
                        <span className={`font-medium ${
                          rec.priority === 'high' ? 'text-red-200' :
                          rec.priority === 'medium' ? 'text-yellow-200' :
                          rec.type === 'success' ? 'text-green-200' :
                          'text-blue-200'
                        }`}>
                          {rec.title}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        rec.priority === 'high' ? 'text-red-300' :
                        rec.priority === 'medium' ? 'text-yellow-300' :
                        rec.type === 'success' ? 'text-green-300' :
                        'text-blue-300'
                      }`}>
                        {rec.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!cashFlowAnalysis.metrics && (
          <div className="text-center text-slate-400 py-8">
            <span className="text-4xl block mb-2">💰</span>
            <p>Nessun dato disponibile per l'analisi del cash flow</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}