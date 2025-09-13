'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface WaterfallChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface WaterfallDataPoint {
  month: string;
  income: number;
  expenses: number;
  cumulative: number;
}

export function WaterfallChart({ transactions, expandedChart, setExpandedChart }: WaterfallChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  const waterfallData = useMemo<WaterfallDataPoint[]>(() => {
    if (!transactions.length) return [];

    // Trova la data più antica e più recente nelle transazioni
    const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];
    
    // Inizia dal primo mese della prima transazione
    const startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    // Finisce al mese corrente o al mese dell'ultima transazione, quale è più recente
    const currentDate = new Date();
    const endDate = latestDate > currentDate ? latestDate : currentDate;
    
    const months = [];
    const date = new Date(startDate);
    
    while (date <= endDate) {
      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        monthName: date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
      });
      date.setMonth(date.getMonth() + 1);
    }

    let cumulativeBalance = 0;
    
    return months.map(monthInfo => {
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === monthInfo.year && tDate.getMonth() === monthInfo.month;
      });

      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      cumulativeBalance += monthIncome - monthExpenses;

      return {
        month: monthInfo.monthName,
        income: monthIncome,
        expenses: -monthExpenses,
        cumulative: cumulativeBalance
      };
    });
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Waterfall Flusso Mensile</CardTitle>
            <CardDescription>Come cambia il bilancio mese per mese (ultimi 12 mesi)</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'waterfall' ? null : 'waterfall')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={expandedChart === 'waterfall' ? 500 : 350}>
          <ComposedChart data={waterfallData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis 
              tickFormatter={(value) => {
                if (isVisible) {
                  return `€${(value / 1000).toFixed(0)}k`;
                }
                return '***k';
              }}
            />
            <Tooltip 
              formatter={(value, name) => {
                const displayName = name === 'income' ? 'Entrate' : name === 'expenses' ? 'Uscite' : name === 'cumulative' ? 'Bilancio Cumulativo' : name;
                const formattedValue = isVisible 
                  ? `€${Math.abs(Number(value)).toLocaleString('it-IT')}` 
                  : '€●●●.●●';
                return [formattedValue, displayName];
              }}
              labelFormatter={(label) => `Mese: ${label}`}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#cbd5e1', fontWeight: '600' }}
            />
            <Bar dataKey="income" fill="#22c55e" name="income" />
            <Bar dataKey="expenses" fill="#ef4444" name="expenses" />
            <Line type="monotone" dataKey="cumulative" stroke="#8884d8" strokeWidth={3} name="cumulative" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}