'use client';

import { useMemo, useState, useEffect } from 'react';
import { ParsedData, Transaction } from '@/types/transaction';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter, X, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';
import { SeasonalAnalysisCard } from './analysis/cards/SeasonalAnalysisCard';
import { ParetoAnalysisCard } from './analysis/cards/ParetoAnalysisCard';
import { WeeklyPatternsCard } from './analysis/cards/WeeklyPatternsCard';
import { AnomalyDetectionCard } from './analysis/cards/AnomalyDetectionCard';
import { EfficiencyAnalysisCard } from './analysis/cards/EfficiencyAnalysisCard';
import { BudgetForecastCard } from './analysis/cards/BudgetForecastCard';
import { CashFlowAnalysisCard } from './analysis/cards/CashFlowAnalysisCard';

// Il campo date ora contiene già la data valuta

interface IntelligentAnalysisProps {
  data: ParsedData | null;
}

function AnalysisSection({ 
  title, 
  description, 
  children 
}: { 
  title: string;
  description?: string; 
  children: React.ReactNode; 
}) {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-700 pb-2">
        <h3 className="text-xl font-semibold text-slate-200">{title}</h3>
        {description && (
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function IntelligentAnalysis({ data }: IntelligentAnalysisProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['Tutte']));
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set(['Tutti']));
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set(['Tutti']));
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(true);

  // Calculate current account balance based on transactions
  const calculateAccountBalance = (transactions: Transaction[]) => {
    if (!transactions || transactions.length === 0) {
      return 9337.78; // Starting balance
    }
    
    // Sort transactions by value date (dataValuta) or regular date
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.dataValuta || a.date);
      const dateB = new Date(b.dataValuta || b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Calculate balance by applying transactions in chronological order
    let currentBalance = 9337.78;
    
    for (const transaction of sortedTransactions) {
      if (transaction.type === 'income') {
        currentBalance += Math.abs(transaction.amount);
      } else if (transaction.type === 'expense') {
        currentBalance -= Math.abs(transaction.amount);
      }
    }
    
    return currentBalance;
  };

  const { obfuscateAmount } = useAmountVisibility();

  // Estrai anni disponibili dai dati
  const availableYears = useMemo(() => {
    if (!data?.transactions) return [];
    const years = [...new Set(data.transactions.map(t => new Date(t.date).getFullYear().toString()))];
    return ['Tutti', ...years.sort((a, b) => b.localeCompare(a))];
  }, [data]);

  // Estrai mesi disponibili dai dati
  const availableMonths = useMemo(() => {
    if (!data?.transactions) return [];
    // Ottieni tutti i mesi unici (solo numeri mese, non anno-mese)
    const monthNumbers = [...new Set(data.transactions.map(t => {
      const date = new Date(t.date);
      return (date.getMonth() + 1).toString().padStart(2, '0');
    }))];
    
    const monthNames = {
      '01': 'Gennaio', '02': 'Febbraio', '03': 'Marzo', '04': 'Aprile',
      '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto',
      '09': 'Settembre', '10': 'Ottobre', '11': 'Novembre', '12': 'Dicembre'
    };
    
    const formattedMonths = monthNumbers.sort().map(monthNum => ({
      value: monthNum,
      label: monthNames[monthNum as keyof typeof monthNames]
    }));
    
    return [{ value: 'Tutti', label: 'Tutti' }, ...formattedMonths];
  }, [data]);

  // Estrai categorie disponibili
  const availableCategories = useMemo(() => {
    if (!data?.transactions) return [];
    const categories = [...new Set(data.transactions.map(t => t.category || 'Altro'))];
    return ['Tutte', ...categories.sort()];
  }, [data]);

  // Sincronizza lo stato del toggle con le categorie selezionate
  useEffect(() => {
    if (selectedCategories.has('Tutte')) {
      setAllCategoriesSelected(false);
    } else {
      const totalSpecificCategories = availableCategories.filter(cat => cat !== 'Tutte').length;
      const selectedSpecificCategories = Array.from(selectedCategories).filter(cat => cat !== 'Tutte').length;
      setAllCategoriesSelected(selectedSpecificCategories === totalSpecificCategories && totalSpecificCategories > 0);
    }
  }, [selectedCategories, availableCategories]);

  // Filtra transazioni per categoria, anno e mese
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

  // Get the real account balance from the API response (dynamic)
  const [currentAccountBalance, setCurrentAccountBalance] = useState<number>(9337.78);

  useEffect(() => {
    const fetchAccountBalance = async () => {
      try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
          const data = await response.json();
          if (data.accountBalance) {
            setCurrentAccountBalance(data.accountBalance);
          }
        }
      } catch (error) {
        console.error('Error fetching account balance:', error);
      }
    };
    
    fetchAccountBalance();
  }, []);

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
    setAllCategoriesSelected(true);
  };

  // Toggle per selezionare/deselezionare tutte le categorie
  const toggleAllCategories = () => {
    if (allCategoriesSelected) {
      // Deseleziona tutte le categorie tranne 'Tutte'
      setSelectedCategories(new Set(['Tutte']));
      setAllCategoriesSelected(false);
    } else {
      // Seleziona tutte le categorie disponibili tranne 'Tutte'
      const allSpecificCategories = availableCategories.filter(cat => cat !== 'Tutte');
      setSelectedCategories(new Set(allSpecificCategories));
      setAllCategoriesSelected(true);
    }
  };

  if (!data) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-200 mb-2">
            Analisi Intelligenti
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Il tuo consulente finanziario virtuale che analizza i tuoi dati e fornisce insights actionable
          </p>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Carica i tuoi dati per iniziare</CardTitle>
              <CardDescription>
                Una volta caricati i dati delle transazioni, potrai accedere a:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span>🗓️</span>
                    <span>Analisi Stagionale</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🎯</span>
                    <span>Principio Pareto (80/20)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Rilevamento Anomalie</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span>📈</span>
                    <span>Previsioni Budget</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>💡</span>
                    <span>Consigli di Risparmio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔍</span>
                    <span>Pattern Recognition</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-4xl">🧠</span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-200">
            Analisi Intelligenti
          </h2>
        </div>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Insights automatici basati sui tuoi dati finanziari per aiutarti a prendere decisioni informate
        </p>
        
        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 max-w-4xl mx-auto">
          <div className="bg-blue-900/20 border border-blue-600 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-100">
              {filteredTransactions.length}
            </div>
            <div className="text-sm text-blue-200">Transazioni Analizzate</div>
          </div>
          <div className="bg-green-900/20 border border-green-600 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-100">
{obfuscateAmount(filteredData?.totalIncome || 0)}
            </div>
            <div className="text-sm text-green-200">Entrate Totali</div>
          </div>
          <div className="bg-red-900/20 border border-red-600 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-100">
{obfuscateAmount(filteredData?.totalExpenses || 0)}
            </div>
            <div className="text-sm text-red-200">Spese Totali</div>
          </div>
          <div className={`p-4 rounded-lg ${(filteredData?.netFlow || 0) >= 0 ? 'bg-purple-900/20 border border-purple-600' : 'bg-red-900/20 border border-red-600'}`}>
            <div className={`text-2xl font-bold ${(filteredData?.netFlow || 0) >= 0 ? 'text-purple-100' : 'text-red-100'}`}>
{obfuscateAmount(Math.abs(filteredData?.netFlow || 0))}
            </div>
            <div className={`text-sm ${(filteredData?.netFlow || 0) >= 0 ? 'text-purple-200' : 'text-red-200'}`}>
              {(filteredData?.netFlow || 0) >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </div>
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
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Categorie</h4>
              <button
                onClick={toggleAllCategories}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                title={allCategoriesSelected ? 'Deseleziona tutte le categorie' : 'Seleziona tutte le categorie'}
              >
                {allCategoriesSelected ? (
                  <>
                    <ToggleRight className="h-4 w-4 text-green-600" />
                    Deseleziona Tutte
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                    Seleziona Tutte
                  </>
                )}
              </button>
            </div>
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

      {/* Sezione A: Analisi Temporali */}
      <AnalysisSection 
        title="📊 Analisi Temporali" 
        description="Scopri pattern e tendenze nelle tue abitudini di spesa nel tempo"
      >
        <div className="space-y-6">
          <SeasonalAnalysisCard transactions={filteredTransactions} />
          <WeeklyPatternsCard transactions={filteredTransactions} />
        </div>
      </AnalysisSection>

      {/* Sezione B: Analisi Comportamentali */}
      <AnalysisSection 
        title="🎯 Analisi Comportamentali" 
        description="Comprendi i tuoi comportamenti di spesa e identifica aree di miglioramento"
      >
        <div className="space-y-6">
          <ParetoAnalysisCard transactions={filteredTransactions} />
          <EfficiencyAnalysisCard transactions={filteredTransactions} />
          <AnomalyDetectionCard transactions={filteredTransactions} />
        </div>
      </AnalysisSection>

      {/* Sezione C: Previsioni & Budget */}
      <AnalysisSection 
        title="🔮 Previsioni & Budget" 
        description="Previsioni intelligenti e raccomandazioni per il tuo budget futuro"
      >
        <div className="space-y-6">
          <BudgetForecastCard transactions={filteredTransactions} />
          <CashFlowAnalysisCard 
            transactions={filteredTransactions} 
            currentAccountBalance={currentAccountBalance} 
          />
        </div>
      </AnalysisSection>
    </div>
  );
}