'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, X } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface DailyStat {
  date: string;
  expenses: number;
  count: number;
}

interface CalendarChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
  onDayClick: (dayStats: {date: string, transactions: Transaction[]}) => void;
  selectedCategories: Set<string>;
}

export function CalendarChart({ 
  transactions, 
  expandedChart, 
  setExpandedChart, 
  onDayClick, 
  selectedCategories 
}: CalendarChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  // Calcola le statistiche giornaliere
  const dailyStats = useMemo<DailyStat[]>(() => {
    if (!transactions.length) return [];

    const dailyMap = new Map<string, { expenses: number; count: number }>();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const date = transaction.date;
        const current = dailyMap.get(date) || { expenses: 0, count: 0 };
        dailyMap.set(date, {
          expenses: current.expenses + transaction.amount,
          count: current.count + 1
        });
      });

    return Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      expenses: stats.expenses,
      count: stats.count
    }));
  }, [transactions]);

  // Crea la struttura del calendario
  const calendarData = useMemo(() => {
    if (!dailyStats.length) return { months: [], maxExpenses: 0 };

    const monthsMap = new Map<string, { days: Array<DailyStat | null>, year: number, monthIndex: number }>();
    let maxExpenses = 0;

    dailyStats.forEach(stat => {
      maxExpenses = Math.max(maxExpenses, stat.expenses);
      const date = new Date(stat.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, { 
          days: Array(42).fill(null), 
          year: date.getFullYear(), 
          monthIndex: date.getMonth() 
        });
      }
      
      const month = monthsMap.get(monthKey)!;
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      let mondayBasedFirstDay = firstDay.getDay() - 1;
      if (mondayBasedFirstDay < 0) mondayBasedFirstDay = 6;
      
      const dayIndex = mondayBasedFirstDay + date.getDate() - 1;
      if (dayIndex < 42) {
        month.days[dayIndex] = stat;
      }
    });

    const months = Array.from(monthsMap.entries())
      .map(([key, month]) => ({
        key,
        ...month,
        monthName: new Date(month.year, month.monthIndex).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      }))
      .sort((a, b) => b.key.localeCompare(a.key));

    return { months, maxExpenses };
  }, [dailyStats]);

  const getColorIntensity = (expenses: number, maxExpenses: number) => {
    if (expenses === 0) return 'bg-gray-100';
    const intensity = Math.min(expenses / maxExpenses, 1);
    const hue = Math.max(0, 60 - (intensity * 60)); // Da giallo (60) a rosso (0)
    const saturation = 70 + (intensity * 30); // Da 70% a 100%
    const lightness = Math.max(30, 70 - (intensity * 40)); // Da 70% a 30%
    
    return {
      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      color: lightness < 50 ? '#fff' : '#000'
    };
  };

  const handleDayClick = (dayStat: DailyStat) => {
    const dayTransactions = transactions.filter(t => 
      t.date === dayStat.date && 
      t.type === 'expense'
    );
    onDayClick({ date: dayStat.date, transactions: dayTransactions });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Calendario Spese Giornaliere</CardTitle>
            <CardDescription>
              Visualizzazione a calendario delle spese giornaliere
              {selectedCategories.size === 1 && !selectedCategories.has('Tutte') && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Filtrato: {Array.from(selectedCategories)[0]}
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'calendar' ? null : 'calendar')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${expandedChart === 'calendar' ? 'max-h-[700px]' : 'h-96'} overflow-y-auto space-y-4 bg-slate-900 rounded-lg p-4`}>
          {calendarData.months.slice(0, expandedChart === 'calendar' ? calendarData.months.length : 1).map((month) => (
            <div key={month.key} className="space-y-2">
              <h4 className="text-sm font-medium text-center capitalize sticky top-0 bg-slate-900 z-10 py-1 text-slate-200">
                {month.monthName}
              </h4>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
                  <div key={`${day}-${index}`} className="h-8 flex items-center justify-center font-medium text-slate-400">
                    {day}
                  </div>
                ))}
                {month.days.map((dayStat, index) => {
                  const colorStyle = dayStat ? getColorIntensity(dayStat.expenses, calendarData.maxExpenses) : null;
                  return (
                    <div
                      key={index}
                      className={`h-8 w-full rounded text-xs flex items-center justify-center cursor-pointer transition-all hover:scale-110 font-medium border border-slate-700 ${
                        dayStat 
                          ? 'hover:ring-2 hover:ring-blue-400' 
                          : 'bg-slate-800 text-slate-600'
                      }`}
                      style={colorStyle && typeof colorStyle === 'object' ? colorStyle : undefined}
                      onClick={() => dayStat && handleDayClick(dayStat)}
                      title={dayStat ? `${isVisible ? `€${dayStat.expenses.toLocaleString('it-IT')}` : '€●●●.●●'} (${dayStat.count} transazioni)` : ''}
                    >
                      {dayStat ? new Date(dayStat.date).getDate() : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Legenda */}
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 mt-4 sticky bottom-0 bg-slate-900 py-2">
            <span>Meno</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-slate-800 rounded border border-slate-600"></div>
              <div className="w-3 h-3 rounded border border-slate-600" style={{backgroundColor: 'hsl(60, 70%, 70%)'}}></div>
              <div className="w-3 h-3 rounded border border-slate-600" style={{backgroundColor: 'hsl(45, 85%, 55%)'}}></div>
              <div className="w-3 h-3 rounded border border-slate-600" style={{backgroundColor: 'hsl(30, 100%, 45%)'}}></div>
              <div className="w-3 h-3 rounded border border-slate-600" style={{backgroundColor: 'hsl(15, 100%, 35%)'}}></div>
              <div className="w-3 h-3 rounded border border-slate-600" style={{backgroundColor: 'hsl(0, 100%, 30%)'}}></div>
            </div>
            <span>Più</span>
          </div>
          
          {!expandedChart && calendarData.months.length > 1 && (
            <div className="text-center text-xs text-slate-500 mt-2">
              Clicca per espandere e vedere tutti i {calendarData.months.length} mesi
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}