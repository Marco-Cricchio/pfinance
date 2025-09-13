'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface BalanceEvolutionChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface BalanceDataPoint {
  month: string;
  balance: number;
  income: number;
  expenses: number;
}

export function BalanceEvolutionChart({ transactions, expandedChart, setExpandedChart }: BalanceEvolutionChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  const balanceEvolutionData = useMemo<BalanceDataPoint[]>(() => {
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

      const monthBalance = monthIncome - monthExpenses;
      cumulativeBalance += monthBalance;

      return {
        month: monthInfo.monthName,
        balance: cumulativeBalance,
        income: monthIncome,
        expenses: monthExpenses
      };
    });
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Evoluzione Bilancio</CardTitle>
            <CardDescription>Andamento del bilancio cumulativo nel tempo</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'balance' ? null : 'balance')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={expandedChart === 'balance' ? 500 : 350}>
          <AreaChart data={balanceEvolutionData}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
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
                const formattedValue = isVisible 
                  ? `€${Number(value).toLocaleString('it-IT')}` 
                  : '€●●●.●●';
                switch(name) {
                  case 'balance': return [formattedValue, 'Bilancio Cumulativo'];
                  case 'income': return [formattedValue, 'Entrate del Mese'];
                  case 'expenses': return [formattedValue, 'Uscite del Mese'];
                  default: return [value, name];
                }
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
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="#8884d8" 
              strokeWidth={2}
              fill="url(#balanceGradient)" 
              name="balance"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}