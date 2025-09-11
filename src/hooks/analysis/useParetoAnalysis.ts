import { useMemo } from 'react';
import { Transaction } from '@/types/transaction';
import { Insight } from '@/components/analysis/insights/InsightsList';

interface ParetoItem {
  category: string;
  amount: number;
  percentage: number;
  cumulativePercentage: number;
  count: number;
  isVital: boolean; // Top 20% delle categorie che rappresentano 80% delle spese
}

interface ParetoAnalysis {
  paretoData: ParetoItem[];
  insights: Insight[];
  vitalCategories: ParetoItem[];
  totalExpenses: number;
  paretoThreshold: number; // Soglia 80%
}

export function useParetoAnalysis(transactions: Transaction[]): ParetoAnalysis {
  return useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    if (!expenseTransactions.length) {
      return {
        paretoData: [],
        insights: [],
        vitalCategories: [],
        totalExpenses: 0,
        paretoThreshold: 0
      };
    }

    // Raggruppa per categoria
    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalExpenses = 0;

    expenseTransactions.forEach(transaction => {
      const category = transaction.category || 'Altro';
      const current = categoryMap.get(category) || { amount: 0, count: 0 };
      
      current.amount += transaction.amount;
      current.count += 1;
      totalExpenses += transaction.amount;
      
      categoryMap.set(category, current);
    });

    // Converti in array e ordina per importo decrescente
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / totalExpenses) * 100
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calcola percentuali cumulative e identifica le categorie vitali (80/20)
    let cumulativePercentage = 0;
    const paretoThreshold = 80; // 80% delle spese
    
    const paretoData: ParetoItem[] = sortedCategories.map((item, index) => {
      cumulativePercentage += item.percentage;
      
      return {
        ...item,
        cumulativePercentage,
        isVital: cumulativePercentage <= paretoThreshold
      };
    });

    const vitalCategories = paretoData.filter(item => item.isVital);
    const vitalCategoriesPercentage = (vitalCategories.length / paretoData.length) * 100;

    // Genera insights automatici
    const insights: Insight[] = [];

    // Insight 1: Principio di Pareto
    insights.push({
      id: 'pareto-principle',
      icon: '🎯',
      title: 'Regola 80/20',
      description: `${vitalCategories.length} categorie (${vitalCategoriesPercentage.toFixed(0)}%) rappresentano l'80% delle tue spese totali`,
      value: `${vitalCategories.length} categorie vitali`,
      severity: 'info'
    });

    // Insight 2: Categoria dominante
    if (paretoData.length > 0) {
      const topCategory = paretoData[0];
      insights.push({
        id: 'top-category',
        icon: '👑',
        title: 'Categoria dominante',
        description: `"${topCategory.category}" rappresenta il ${topCategory.percentage.toFixed(0)}% delle tue spese totali`,
        value: `€${topCategory.amount.toLocaleString('it-IT')}`,
        trend: 'up',
        severity: topCategory.percentage > 40 ? 'warning' : 'info'
      });
    }

    // Insight 3: Potenziale di risparmio
    if (vitalCategories.length > 0) {
      const potentialSavings = vitalCategories.reduce((sum, cat) => sum + cat.amount, 0) * 0.05; // 5% di riduzione
      insights.push({
        id: 'savings-potential',
        icon: '💰',
        title: 'Potenziale di risparmio',
        description: `Riducendo del 5% le categorie vitali potresti risparmiare €${potentialSavings.toFixed(0)} al mese`,
        value: `€${potentialSavings.toFixed(0)}/mese`,
        severity: 'success'
      });
    }

    // Insight 4: Diversificazione
    const concentrationRisk = paretoData.length < 5 ? 'alta' : paretoData.length < 10 ? 'media' : 'bassa';
    insights.push({
      id: 'diversification',
      icon: '📊',
      title: 'Diversificazione spese',
      description: `Hai ${paretoData.length} categorie di spesa attive con concentrazione ${concentrationRisk}`,
      value: `${paretoData.length} categorie`,
      severity: concentrationRisk === 'alta' ? 'warning' : concentrationRisk === 'media' ? 'info' : 'success'
    });

    // Insight 5: Raccomandazioni specifiche per le top 3 categorie
    if (vitalCategories.length >= 3) {
      const top3Categories = vitalCategories.slice(0, 3);
      const top3Percentage = top3Categories.reduce((sum, cat) => sum + cat.percentage, 0);
      
      insights.push({
        id: 'focus-areas',
        icon: '🔍',
        title: 'Aree di focus',
        description: `Concentrati su ${top3Categories.map(c => c.category).join(', ')} per il massimo impatto (${top3Percentage.toFixed(0)}% del totale)`,
        value: `Top 3: ${top3Percentage.toFixed(0)}%`,
        severity: 'info'
      });
    }

    return {
      paretoData,
      insights,
      vitalCategories,
      totalExpenses,
      paretoThreshold
    };
  }, [transactions]);
}