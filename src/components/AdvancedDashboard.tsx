'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, X, TrendingUp, TrendingDown, Users, Target, ChevronDown, ChevronUp
} from 'lucide-react';
import { ParsedData, Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';
import { BudgetChart } from '@/components/charts/BudgetChart';
import { CalendarChart } from '@/components/charts/CalendarChart';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { BalanceEvolutionChart } from '@/components/charts/BalanceEvolutionChart';
import { Top10ExpensesChart } from '@/components/charts/Top10ExpensesChart';
import { TopVendorsChart } from '@/components/charts/TopVendorsChart';
import { WeeklySpendingChart } from '@/components/charts/WeeklySpendingChart';
import { CategoryDistributionChart } from '@/components/charts/CategoryDistributionChart';
import { SpendingProfileChart } from '@/components/charts/SpendingProfileChart';
import { AmountFrequencyChart } from '@/components/charts/AmountFrequencyChart';
import { CategoryAmountDistributionChart } from '@/components/charts/CategoryAmountDistributionChart';
import { AnomalyDetectionCard } from './analysis/cards/AnomalyDetectionCard';

interface BudgetAnalysis {
  currentMonth: number;
  averageBudget: number;
  percentage: number;
  difference: number;
  isOverBudget: boolean;
}

interface AdvancedDashboardProps {
  data: ParsedData | null;
}

export function AdvancedDashboard({ data }: AdvancedDashboardProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['Tutte']));
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set(['Tutti']));
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set(['Tutti']));
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{date: string, transactions: Transaction[]} | null>(null);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);

  const { obfuscateAmount } = useAmountVisibility();

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

  // Estrai categorie disponibili
  const availableCategories = useMemo(() => {
    if (!data?.transactions) return [];
    const categories = [...new Set(data.transactions.map(t => t.category || 'Altro'))];
    return ['Tutte', ...categories.sort()];
  }, [data]);

  // Filtra transazioni per categoria, anni e mesi
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

  // Calcola dati filtrati
  const filteredData = useMemo(() => {
    if (!filteredTransactions.length) return null;
    
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      transactions: filteredTransactions,
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses
    };
  }, [filteredTransactions]);

  // Budget Analysis
  const budgetAnalysis = useMemo<BudgetAnalysis | null>(() => {
    if (!filteredData?.transactions) return null;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Current month expenses
    const currentMonthExpenses = filteredData.transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'expense' && 
               tDate.getMonth() === currentMonth && 
               tDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Last 6 months average (excluding current month)
    const last6MonthsExpenses: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthExpenses = filteredData.transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return t.type === 'expense' && 
                 tDate.getMonth() === date.getMonth() && 
                 tDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, t) => sum + t.amount, 0);
      last6MonthsExpenses.push(monthExpenses);
    }
    
    const averageBudget = last6MonthsExpenses.reduce((sum, amount) => sum + amount, 0) / 6;
    const percentage = averageBudget > 0 ? (currentMonthExpenses / averageBudget) * 100 : 0;
    const difference = currentMonthExpenses - averageBudget;
    const isOverBudget = currentMonthExpenses > averageBudget;
    
    return {
      currentMonth: currentMonthExpenses,
      averageBudget,
      percentage,
      difference,
      isOverBudget
    };
  }, [filteredData]);

  // Handlers per filtri
  const toggleCategory = (category: string) => {
    const newSelection = new Set(selectedCategories);
    
    if (category === 'Tutte') {
      setSelectedCategories(new Set(['Tutte']));
    } else {
      if (newSelection.has('Tutte')) {
        newSelection.delete('Tutte');
      }
      
      if (newSelection.has(category)) {
        newSelection.delete(category);
      } else {
        newSelection.add(category);
      }
      
      if (newSelection.size === 0) {
        newSelection.add('Tutte');
      }
      
      setSelectedCategories(newSelection);
    }
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

  if (!data) {
    return (
      <div className="grid gap-6">
        <div className="text-center py-8">
          <h3 className="font-semibold mb-2">Dashboard Avanzata</h3>
          <p className="text-muted-foreground">Carica i tuoi dati per vedere analisi avanzate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header e Filtri */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Avanzata</h2>
          <p className="text-muted-foreground">
            Analisi dettagliate dei tuoi dati finanziari
          </p>
        </div>
      </div>

      {/* Pannello Filtri */}
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

      {/* KPI Cards */}
      {filteredData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entrate Filtrate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
{obfuscateAmount(filteredData.totalIncome)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uscite Filtrate</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
{obfuscateAmount(filteredData.totalExpenses)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transazioni</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredData.transactions.length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Spesa Media</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
{obfuscateAmount(filteredData.transactions.filter(t => t.type === 'expense').length > 0 
                  ? Math.round(filteredData.totalExpenses / filteredData.transactions.filter(t => t.type === 'expense').length)
                  : 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Charts in specified order */}
      {filteredData && (
        <div className="space-y-6">
          {/* 1. Budget Mensile Corrente */}
          <BudgetChart budgetAnalysis={budgetAnalysis} />
          
          {/* 2. Calendario Spese Giornaliere */}
          <CalendarChart 
            transactions={filteredData.transactions}
            expandedChart={expandedChart}
            setExpandedChart={setExpandedChart}
            onDayClick={setSelectedDay}
            selectedCategories={selectedCategories}
          />
          
          {/* 3. Waterfall Flusso Mensile */}
          <WaterfallChart 
            transactions={filteredData.transactions}
            expandedChart={expandedChart}
            setExpandedChart={setExpandedChart}
          />
          
          {/* 4. Evoluzione Bilancio */}
          <BalanceEvolutionChart 
            transactions={filteredData.transactions}
            expandedChart={expandedChart}
            setExpandedChart={setExpandedChart}
          />
          
          {/* Row of 3: Top 10 Spese + Top Fornitori + Spese per Giorno */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Top10ExpensesChart 
              transactions={filteredData.transactions}
              expandedChart={expandedChart}
              setExpandedChart={setExpandedChart}
            />
            <TopVendorsChart 
              transactions={filteredData.transactions}
              expandedChart={expandedChart}
              setExpandedChart={setExpandedChart}
            />
            <WeeklySpendingChart 
              transactions={filteredData.transactions}
              expandedChart={expandedChart}
              setExpandedChart={setExpandedChart}
            />
          </div>
          
          {/* Row of 3: Distribuzione per Categoria + Profilo di Spesa + Frequenza per Importo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CategoryDistributionChart 
              transactions={filteredData.transactions}
              expandedChart={expandedChart}
              setExpandedChart={setExpandedChart}
            />
            <SpendingProfileChart 
              transactions={filteredData.transactions}
              expandedChart={expandedChart}
              setExpandedChart={setExpandedChart}
            />
            <AmountFrequencyChart 
              transactions={filteredData.transactions}
              expandedChart={expandedChart}
              setExpandedChart={setExpandedChart}
            />
          </div>
          
          {/* 8. Distribuzione Importi per Categoria */}
          <CategoryAmountDistributionChart 
            transactions={filteredData.transactions}
            expandedChart={expandedChart}
            setExpandedChart={setExpandedChart}
          />

          {/* 9. Anomaly Detection */}
          <AnomalyDetectionCard transactions={filteredData.transactions} />
        </div>
      )}
      
      {/* Modal per transazioni giornaliere */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-slate-700">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div>
                <h3 className="text-xl font-bold capitalize">{selectedDay.date}</h3>
                <p className="text-slate-300 text-sm">
                  {selectedDay.transactions.length} transazioni • {obfuscateAmount(selectedDay.transactions.reduce((sum, t) => sum + t.amount, 0))}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto bg-slate-900">
              <div className="space-y-3">
                {selectedDay.transactions.map((transaction, index) => (
                  <div
                    key={`${transaction.id}-${index}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.type === 'expense' ? 'bg-red-400' : 'bg-green-400'
                        }`} />
                        <div>
                          <p className="font-medium text-white">{transaction.description}</p>
                          {transaction.category && (
                            <p className="text-sm text-slate-400">{transaction.category}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === 'expense' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {transaction.type === 'expense' ? '-' : '+'}{obfuscateAmount(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {selectedDay.transactions.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <p>Nessuna transazione per questo giorno</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center border-t border-slate-700">
              <div className="text-sm text-slate-300">
                Filtrato per: {selectedCategories.has('Tutte') ? 'Tutte le categorie' : Array.from(selectedCategories).join(', ')}
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}