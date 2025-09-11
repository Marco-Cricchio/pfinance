import { useMemo } from 'react';
import { Transaction } from '@/types/transaction';
import { Insight } from '@/components/analysis/insights/InsightsList';

interface MonthlyData {
  month: string;
  monthIndex: number;
  year: number;
  totalExpenses: number;
  totalIncome: number;
  netFlow: number;
  transactionCount: number;
}

interface SeasonalAnalysis {
  monthlyData: MonthlyData[];
  insights: Insight[];
  seasonalTrends: {
    highestMonth: { month: string; amount: number };
    lowestMonth: { month: string; amount: number };
    averageMonthly: number;
    seasonality: string;
  };
}

export function useSeasonalAnalysis(transactions: Transaction[]): SeasonalAnalysis {
  return useMemo(() => {
    if (!transactions.length) {
      return {
        monthlyData: [],
        insights: [],
        seasonalTrends: {
          highestMonth: { month: '', amount: 0 },
          lowestMonth: { month: '', amount: 0 },
          averageMonthly: 0,
          seasonality: 'Nessun dato disponibile'
        }
      };
    }

    // Raggruppa transazioni per mese
    const monthlyMap = new Map<string, MonthlyData>();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
          monthIndex: date.getMonth(),
          year: date.getFullYear(),
          totalExpenses: 0,
          totalIncome: 0,
          netFlow: 0,
          transactionCount: 0
        });
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData.transactionCount++;
      
      if (transaction.type === 'expense') {
        monthData.totalExpenses += transaction.amount;
      } else {
        monthData.totalIncome += transaction.amount;
      }
      
      monthData.netFlow = monthData.totalIncome - monthData.totalExpenses;
    });

    const monthlyData = Array.from(monthlyMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthIndex - b.monthIndex;
      });

    // Calcola trend stagionali
    const expensesByMonth = monthlyData.reduce((acc, curr) => {
      acc[curr.monthIndex] = (acc[curr.monthIndex] || 0) + curr.totalExpenses;
      return acc;
    }, {} as Record<number, number>);

    const highestMonth = monthlyData.reduce((prev, curr) => 
      curr.totalExpenses > prev.totalExpenses ? curr : prev
    );
    
    const lowestMonth = monthlyData.reduce((prev, curr) => 
      curr.totalExpenses < prev.totalExpenses ? curr : prev
    );

    const averageMonthly = monthlyData.reduce((sum, month) => sum + month.totalExpenses, 0) / monthlyData.length;

    // Determina stagionalità
    let seasonality = 'Spese stabili durante l\'anno';
    const variation = ((highestMonth.totalExpenses - lowestMonth.totalExpenses) / averageMonthly) * 100;
    
    if (variation > 30) {
      if (highestMonth.monthIndex >= 10 || highestMonth.monthIndex <= 1) {
        seasonality = 'Picco invernale - Spese maggiori in inverno';
      } else if (highestMonth.monthIndex >= 5 && highestMonth.monthIndex <= 8) {
        seasonality = 'Picco estivo - Spese maggiori in estate';
      } else {
        seasonality = 'Pattern stagionale significativo';
      }
    }

    // Genera insights automatici
    const insights: Insight[] = [];

    // Insight 1: Mese più costoso
    insights.push({
      id: 'highest-month',
      icon: '📈',
      title: 'Mese più costoso',
      description: `${highestMonth.month} è stato il tuo mese più costoso con €${highestMonth.totalExpenses.toLocaleString('it-IT')}`,
      value: `+${((highestMonth.totalExpenses - averageMonthly) / averageMonthly * 100).toFixed(0)}% vs media`,
      trend: 'up',
      severity: 'warning'
    });

    // Insight 2: Variazione stagionale
    if (variation > 20) {
      insights.push({
        id: 'seasonal-variation',
        icon: '🎯',
        title: 'Forte variazione stagionale',
        description: `Le tue spese variano del ${variation.toFixed(0)}% tra il mese più e meno costoso`,
        value: `${variation.toFixed(0)}% variazione`,
        severity: 'info'
      });
    }

    // Insight 3: Consiglio risparmio
    if (highestMonth.totalExpenses > averageMonthly * 1.2) {
      const savingsNeeded = (highestMonth.totalExpenses - averageMonthly) / 11;
      insights.push({
        id: 'savings-advice',
        icon: '💰',
        title: 'Consiglio di risparmio',
        description: `Metti da parte €${savingsNeeded.toFixed(0)}/mese per gestire i picchi di spesa`,
        value: `€${savingsNeeded.toFixed(0)}/mese`,
        severity: 'success'
      });
    }

    // Insight 4: Trend generale
    if (monthlyData.length >= 3) {
      const recentMonths = monthlyData.slice(-3);
      const olderMonths = monthlyData.slice(0, Math.min(3, monthlyData.length - 3));
      
      if (olderMonths.length > 0) {
        const recentAvg = recentMonths.reduce((sum, m) => sum + m.totalExpenses, 0) / recentMonths.length;
        const olderAvg = olderMonths.reduce((sum, m) => sum + m.totalExpenses, 0) / olderMonths.length;
        const trendChange = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (Math.abs(trendChange) > 10) {
          insights.push({
            id: 'recent-trend',
            icon: trendChange > 0 ? '⚠️' : '✅',
            title: 'Trend recente',
            description: `Le tue spese sono ${trendChange > 0 ? 'aumentate' : 'diminuite'} del ${Math.abs(trendChange).toFixed(0)}% negli ultimi mesi`,
            value: `${trendChange > 0 ? '+' : ''}${trendChange.toFixed(0)}%`,
            trend: trendChange > 0 ? 'up' : 'down',
            severity: trendChange > 0 ? 'warning' : 'success'
          });
        }
      }
    }

    return {
      monthlyData,
      insights,
      seasonalTrends: {
        highestMonth: { month: highestMonth.month, amount: highestMonth.totalExpenses },
        lowestMonth: { month: lowestMonth.month, amount: lowestMonth.totalExpenses },
        averageMonthly,
        seasonality
      }
    };
  }, [transactions]);
}