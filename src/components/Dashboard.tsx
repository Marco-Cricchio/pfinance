'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Filter, X, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, Line, LineChart, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { ParsedData, Transaction } from '@/types/transaction';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface DashboardProps {
  data: ParsedData | null;
}

const COLORS = [
  '#FF6B6B', // Rosso corallo vivace
  '#4ECDC4', // Turchese brillante  
  '#45B7D1', // Azzurro oceano
  '#96CEB4', // Verde menta
  '#FFEAA7', // Giallo caldo
  '#DDA0DD', // Lavanda
  '#98D8C8', // Verde acqua
  '#F7DC6F', // Oro chiaro
  '#BB8FCE', // Viola pastello
  '#85C1E9', // Blu cielo
  '#F8C471', // Arancione pesca
  '#82E0AA'  // Verde smeraldo
];

// Mapping colori per categorie
const CATEGORY_COLORS: Record<string, string> = {
  'Alimenti': 'bg-green-100 text-green-800',
  'Casa': 'bg-blue-100 text-blue-800',
  'Bar': 'bg-orange-100 text-orange-800',
  'Abbonamenti': 'bg-purple-100 text-purple-800',
  'Tabacchi': 'bg-gray-100 text-gray-800',
  'Abbigliamento': 'bg-pink-100 text-pink-800',
  'Trasporti': 'bg-indigo-100 text-indigo-800',
  'Scuola': 'bg-yellow-100 text-yellow-800',
  'Ristorazione': 'bg-red-100 text-red-800',
  'Noleggio_Cell': 'bg-cyan-100 text-cyan-800',
  'Salute': 'bg-emerald-100 text-emerald-800',
  'Daniele': 'bg-violet-100 text-violet-800',
  'Benessere': 'bg-teal-100 text-teal-800',
  'Svago': 'bg-fuchsia-100 text-fuchsia-800',
  'Viaggi': 'bg-sky-100 text-sky-800',
  'Stipendio': 'bg-green-100 text-green-800',
  'Pensione': 'bg-blue-100 text-blue-800',
  'Rimborsi': 'bg-lime-100 text-lime-800',
  'Spese Bancarie': 'bg-red-100 text-red-800',
  'Prelievi': 'bg-slate-100 text-slate-800',
  'Trasferimenti': 'bg-amber-100 text-amber-800',
  'Utenze': 'bg-orange-100 text-orange-800',
  'Shopping': 'bg-pink-100 text-pink-800',
  'Tasse': 'bg-red-100 text-red-800',
  'Assicurazioni': 'bg-blue-100 text-blue-800',
  'Altro': 'bg-gray-100 text-gray-800'
};

export function Dashboard({ data }: DashboardProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['Tutte']));
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set(['Tutti']));
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set(['Tutti']));
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const { isVisible, obfuscateAmount } = useAmountVisibility();

  // Helper function for formatting amounts with visibility control
  const formatAmount = (amount: number): string => {
    return obfuscateAmount(amount);
  };

  // Custom tooltip formatter
  const tooltipFormatter = (value: number, name?: string) => {
    const formattedValue = isVisible 
      ? `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`
      : '€●●●.●●';
    return [formattedValue, name || 'Importo'];
  };

  // Y-axis formatter  
  const yAxisFormatter = (value: number) => {
    return isVisible 
      ? `€${value.toLocaleString('it-IT')}`
      : '€●●●';
  };

  // Estrai anni disponibili dai dati
  const availableYears = useMemo(() => {
    if (!data?.transactions) return [];
    const years = [...new Set(data.transactions.map(t => new Date(t.date).getFullYear().toString()))];
    return ['Tutti', ...years.sort((a, b) => b.localeCompare(a))];
  }, [data]);

  // Estrai mesi disponibili dai dati (solo nomi dei mesi)
  const availableMonths = useMemo(() => {
    if (!data?.transactions) return [];
    const months = [...new Set(data.transactions.map(t => {
      const date = new Date(t.date);
      return (date.getMonth() + 1).toString().padStart(2, '0');
    }))];
    const monthNames = {
      '01': 'Gennaio', '02': 'Febbraio', '03': 'Marzo', '04': 'Aprile',
      '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto',
      '09': 'Settembre', '10': 'Ottobre', '11': 'Novembre', '12': 'Dicembre'
    };
    const sortedMonths = months.sort().map(monthNum => ({
      value: monthNum,
      label: monthNames[monthNum as keyof typeof monthNames]
    }));
    return [{ value: 'Tutti', label: 'Tutti' }, ...sortedMonths];
  }, [data]);

  // Ottieni tutte le categorie disponibili
  const availableCategories = useMemo(() => {
    if (!data?.transactions) return ['Tutte'];
    
    const categories = new Set(['Tutte']);
    data.transactions.forEach(transaction => {
      categories.add(transaction.category || 'Altro');
    });
    
    return Array.from(categories).sort();
  }, [data]);

  // Filtra le transazioni in base alle categorie selezionate, anni e mesi
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    
    const filtered = data.transactions.filter(transaction => {
      const categoryMatch = selectedCategories.has('Tutte') || 
                           selectedCategories.has(transaction.category || 'Altro');
      
      const yearMatch = selectedYears.has('Tutti') || 
                       selectedYears.has(new Date(transaction.date).getFullYear().toString());
      
      const monthMatch = selectedMonths.has('Tutti') || 
                        selectedMonths.has((new Date(transaction.date).getMonth() + 1).toString().padStart(2, '0'));
      
      return categoryMatch && yearMatch && monthMatch;
    });
    
    return filtered;
  }, [data, selectedCategories, selectedYears, selectedMonths]);

  // Ricalcola i totali per le transazioni filtrate
  const filteredData = useMemo(() => {
    if (!data) return null;
    
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      ...data,
      transactions: filteredTransactions,
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses
    };
  }, [data, filteredTransactions]);

  // Gestione toggle categorie
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const newSelection = new Set(prev);
      
      if (category === 'Tutte') {
        return new Set(['Tutte']);
      }
      
      // Rimuovi 'Tutte' se selezioniamo una categoria specifica
      if (newSelection.has('Tutte')) {
        newSelection.delete('Tutte');
      }
      
      if (newSelection.has(category)) {
        newSelection.delete(category);
        // Se non ci sono più categorie selezionate, torna a 'Tutte'
        if (newSelection.size === 0) {
          newSelection.add('Tutte');
        }
      } else {
        newSelection.add(category);
      }
      
      return newSelection;
    });
  };

  // Gestori per anni
  const toggleYear = (year: string) => {
    setSelectedYears(prev => {
      const newSelection = new Set(prev);
      
      if (year === 'Tutti') {
        return new Set(['Tutti']);
      }
      
      if (newSelection.has('Tutti')) {
        newSelection.delete('Tutti');
      }
      
      if (newSelection.has(year)) {
        newSelection.delete(year);
        if (newSelection.size === 0) {
          newSelection.add('Tutti');
        }
      } else {
        newSelection.add(year);
      }
      
      return newSelection;
    });
  };

  // Gestori per mesi
  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => {
      const newSelection = new Set(prev);
      
      if (month === 'Tutti') {
        return new Set(['Tutti']);
      }
      
      if (newSelection.has('Tutti')) {
        newSelection.delete('Tutti');
      }
      
      if (newSelection.has(month)) {
        newSelection.delete(month);
        if (newSelection.size === 0) {
          newSelection.add('Tutti');
        }
      } else {
        newSelection.add(month);
      }
      
      return newSelection;
    });
  };

  const clearAllFilters = () => {
    setSelectedCategories(new Set(['Tutte']));
    setSelectedYears(new Set(['Tutti']));
    setSelectedMonths(new Set(['Tutti']));
  };

  const getCategoryColorClass = (category: string) => {
    return CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';
  };

  const chartData = useMemo(() => {
    if (!filteredData?.transactions) return [];
    
    const categoryTotals = filteredData.transactions.reduce((acc, transaction) => {
      if (transaction.type === 'expense') {
        acc[transaction.category || 'Altro'] = (acc[transaction.category || 'Altro'] || 0) + transaction.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Mostra solo le prime 10 categorie
  }, [filteredData]);

  const monthlyData = useMemo(() => {
    if (!filteredData?.transactions) return [];
    
    const monthly = filteredData.transactions.reduce((acc, transaction) => {
      const month = new Date(transaction.date).toLocaleString('it-IT', { month: 'short', year: 'numeric' });
      
      if (!acc[month]) {
        acc[month] = { month, income: 0, expenses: 0 };
      }
      
      if (transaction.type === 'income') {
        acc[month].income += transaction.amount;
      } else {
        acc[month].expenses += transaction.amount;
      }
      
      return acc;
    }, {} as Record<string, { month: string; income: number; expenses: number }>);
    
    const sortedData = Object.values(monthly).sort((a, b) => {
      // Converte "gen 2025" in "2025-01" per un sorting corretto
      const parseMonth = (monthStr: string) => {
        const monthMap: Record<string, string> = {
          'gen': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mag': '05', 'giu': '06',
          'lug': '07', 'ago': '08', 'set': '09', 'ott': '10', 'nov': '11', 'dic': '12'
        };
        const [month, year] = monthStr.split(' ');
        return `${year}-${monthMap[month] || '01'}`;
      };
      return parseMonth(a.month).localeCompare(parseMonth(b.month));
    });
    
    // Calcola la media mobile per la trendline
    const calculateMovingAverage = (data: any[], key: 'income' | 'expenses', period: number = 3) => {
      return data.map((_, index) => {
        const start = Math.max(0, index - Math.floor(period / 2));
        const end = Math.min(data.length, start + period);
        const subset = data.slice(start, end);
        return subset.reduce((sum, item) => sum + item[key], 0) / subset.length;
      });
    };
    
    const incomeAverage = calculateMovingAverage(sortedData, 'income');
    const expensesAverage = calculateMovingAverage(sortedData, 'expenses');
    
    return sortedData.map((item, index) => ({
      ...item,
      incomeTrend: incomeAverage[index],
      expensesTrend: expensesAverage[index]
    }));
  }, [filteredData]);

  // Calcola la media mensile basata sui dati filtrati
  const monthlyAverage = useMemo(() => {
    if (!monthlyData?.length) return { income: 0, expenses: 0 };
    
    const totalIncome = monthlyData.reduce((sum, month) => sum + month.income, 0);
    const totalExpenses = monthlyData.reduce((sum, month) => sum + month.expenses, 0);
    
    return {
      income: totalIncome / monthlyData.length,
      expenses: totalExpenses / monthlyData.length
    };
  }, [monthlyData]);

  if (!data) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 border-green-400 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Entrate Totali</CardTitle>
            <TrendingUp className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatAmount(filteredData!.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-red-400 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Uscite Totali</CardTitle>
            <TrendingDown className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatAmount(filteredData!.totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 border-teal-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Flusso Netto</CardTitle>
            <DollarSign className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatAmount(filteredData!.netFlow)}
            </div>
            <p className="text-xs text-white/80">
              {isVisible ? (filteredData!.netFlow >= 0 ? 'In positivo' : 'In negativo') : '●●●●●●●●●'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className={`grid gap-6 ${expandedChart ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Spese per Categoria</CardTitle>
                <CardDescription>
                  {selectedCategories.has('Tutte') 
                    ? 'Distribuzione delle tue spese principali' 
                    : `Categorie selezionate: ${Array.from(selectedCategories).join(', ')}`
                  }
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedChart(expandedChart === 'pie' ? null : 'pie')}
                title={expandedChart === 'pie' ? 'Comprimi grafico' : 'Espandi grafico'}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer 
              width="100%" 
              height={expandedChart === 'pie' ? 700 : 350}
            >
              <PieChart margin={{ 
                top: expandedChart === 'pie' ? 40 : 20, 
                right: expandedChart === 'pie' ? 40 : 20, 
                bottom: expandedChart === 'pie' ? 40 : 20, 
                left: expandedChart === 'pie' ? 40 : 20 
              }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={expandedChart === 'pie' ? 220 : 120}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="#1f2937"
                  strokeWidth={3}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={tooltipFormatter}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={expandedChart === 'pie' ? 50 : 36}
                  wrapperStyle={{ 
                    fontSize: expandedChart === 'pie' ? '14px' : '12px', 
                    paddingTop: '10px' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>Trend Mensile</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{backgroundColor: '#22c55e'}}></div>
                      Media: {isVisible ? `€${monthlyAverage.income.toFixed(0)}` : '€●●●'}
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{backgroundColor: '#FF6B6B'}}></div>
                      Media: {isVisible ? `€${monthlyAverage.expenses.toFixed(0)}` : '€●●●'}
                    </span>
                  </div>
                </div>
                <CardDescription>
                  {selectedCategories.has('Tutte') 
                    ? 'Entrate vs Uscite per mese con trendline' 
                    : `Trend filtrato per: ${Array.from(selectedCategories).join(', ')}`
                  }
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedChart(expandedChart === 'trend' ? null : 'trend')}
                title={expandedChart === 'trend' ? 'Comprimi grafico' : 'Espandi grafico'}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer 
              width="100%" 
              height={expandedChart === 'trend' ? 700 : 350}
            >
              <ComposedChart data={monthlyData} margin={{ 
                top: expandedChart === 'trend' ? 40 : 20, 
                right: expandedChart === 'trend' ? 60 : 30, 
                left: expandedChart === 'trend' ? 40 : 20, 
                bottom: expandedChart === 'trend' ? 40 : 5 
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: expandedChart === 'trend' ? 14 : 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tickFormatter={yAxisFormatter}
                  stroke="#666"
                  tick={{ fontSize: expandedChart === 'trend' ? 14 : 12 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    let displayName;
                    switch(name) {
                      case 'income':
                        displayName = 'Entrate';
                        break;
                      case 'expenses':
                        displayName = 'Uscite';
                        break;
                      case 'incomeTrend':
                        displayName = 'Trend Entrate';
                        break;
                      case 'expensesTrend':
                        displayName = 'Trend Uscite';
                        break;
                      default:
                        displayName = name;
                    }
                    const formattedValue = isVisible 
                      ? `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`
                      : '€●●●.●●';
                    return [formattedValue, displayName];
                  }}
                  labelFormatter={(label) => `Mese: ${label}`}
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                    color: '#f8fafc'
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                  labelStyle={{ color: '#cbd5e1', fontWeight: '600' }}
                />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: expandedChart === 'trend' ? '14px' : '12px', 
                    paddingTop: expandedChart === 'trend' ? '20px' : '10px' 
                  }}
                />
                <Bar 
                  dataKey="income" 
                  fill="#22c55e" 
                  name="Entrate" 
                  radius={[4, 4, 0, 0]}
                  stroke="#16a34a"
                  strokeWidth={2}
                />
                <Bar 
                  dataKey="expenses" 
                  fill="#FF6B6B" 
                  name="Uscite" 
                  radius={[4, 4, 0, 0]}
                  stroke="#E55353"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="incomeTrend" 
                  stroke="#16a34a" 
                  strokeWidth={expandedChart === 'trend' ? 4 : 3}
                  strokeDasharray="8 4"
                  name="Trend Entrate"
                  dot={{ fill: '#26A69A', strokeWidth: 2, r: expandedChart === 'trend' ? 6 : 4 }}
                  activeDot={{ r: expandedChart === 'trend' ? 8 : 6, fill: '#26A69A' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expensesTrend" 
                  stroke="#E55353" 
                  strokeWidth={expandedChart === 'trend' ? 4 : 3}
                  strokeDasharray="8 4"
                  name="Trend Uscite"
                  dot={{ fill: '#E55353', strokeWidth: 2, r: expandedChart === 'trend' ? 6 : 4 }}
                  activeDot={{ r: expandedChart === 'trend' ? 8 : 6, fill: '#E55353' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filtro Categoria - Posizionato tra grafici e transazioni */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtri Avanzati
              </CardTitle>
              <CardDescription>
                Filtra i dati per categoria e periodo temporale
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {filteredTransactions.length} di {data.transactions.length} transazioni
              </div>
              {(!selectedCategories.has('Tutte') || !selectedYears.has('Tutti') || !selectedMonths.has('Tutti')) && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                  Cancella filtri
                </button>
              )}
              <button
                onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isFiltersCollapsed ? (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Espandi
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Comprimi
                  </>
                )}
              </button>
            </div>
          </div>
        </CardHeader>
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isFiltersCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
          }`}
        >
          <CardContent className="space-y-4 pt-4">
          {/* Filtro Anno */}
          <div>
            <h4 className="font-medium mb-2">Anno</h4>
            <div className="flex flex-wrap gap-2">
              {availableYears.map((year) => {
                const isSelected = selectedYears.has(year);
                return (
                  <Badge
                    key={year}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer ${!isSelected ? 'text-muted-foreground/70' : 'bg-blue-100 text-blue-800'}`}
                    onClick={() => toggleYear(year)}
                  >
                    {year}
                    {isSelected && year !== 'Tutti' && (
                      <X className="ml-1 h-3 w-3 inline" />
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
          
          {/* Filtro Mese */}
          <div>
            <h4 className="font-medium mb-2">Mese</h4>
            <div className="flex flex-wrap gap-2">
              {availableMonths.map((month) => {
                const isSelected = selectedMonths.has(month.value);
                return (
                  <Badge
                    key={month.value}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer ${!isSelected ? 'text-muted-foreground/70' : 'bg-green-100 text-green-800'}`}
                    onClick={() => toggleMonth(month.value)}
                  >
                    {month.label}
                    {isSelected && month.value !== 'Tutti' && (
                      <X className="ml-1 h-3 w-3 inline" />
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
          
          {/* Filtro Categorie */}
          <div>
            <h4 className="font-medium mb-2">Categorie</h4>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((category) => {
                const isSelected = selectedCategories.has(category);
                const isAllSelected = selectedCategories.has('Tutte');
              
              const shouldHighlight = isSelected;
              
              return (
                <Badge
                  key={category}
                  variant={shouldHighlight ? "default" : "outline"}
                  className={`cursor-pointer ${!shouldHighlight ? 'text-muted-foreground/70' : 'bg-purple-100 text-purple-800'}`}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                  {isSelected && category !== 'Tutte' && (
                    <X className="ml-1 h-3 w-3 inline" />
                  )}
                </Badge>
              );
              })}
            </div>
          </div>
          </CardContent>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategories.has('Tutte') 
              ? 'Tutte le Transazioni' 
              : selectedCategories.size === 1 
                ? `Transazioni - ${Array.from(selectedCategories)[0]}`
                : `Transazioni - ${selectedCategories.size} categorie`
            }
          </CardTitle>
          <CardDescription>
            {selectedCategories.has('Tutte') 
              ? `Elenco completo delle tue ${data.transactions.length} transazioni`
              : `${filteredTransactions.length} transazioni filtrate`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{
                      backgroundColor: transaction.type === 'income' ? '#4ECDC4' : '#FF6B6B'
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{transaction.description}</p>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        getCategoryColorClass(transaction.category || 'Altro')
                      }`}>
                        {transaction.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
                <div className={`font-semibold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}{isVisible ? `€${transaction.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '€●●●.●●'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}