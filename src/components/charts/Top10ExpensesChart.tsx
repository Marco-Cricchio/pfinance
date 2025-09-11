'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface Top10ExpensesChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface TopExpenseItem {
  description: string;
  amount: number;
  count: number;
  category: string;
}

export function Top10ExpensesChart({ transactions, expandedChart, setExpandedChart }: Top10ExpensesChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  const top10ExpensesData = useMemo<TopExpenseItem[]>(() => {
    if (!transactions.length) return [];

    const expenseMap = new Map<string, { amount: number; count: number; category: string }>();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const current = expenseMap.get(transaction.description) || { amount: 0, count: 0, category: transaction.category || 'Altro' };
        expenseMap.set(transaction.description, {
          amount: current.amount + transaction.amount,
          count: current.count + 1,
          category: transaction.category || 'Altro'
        });
      });

    return Array.from(expenseMap.entries())
      .map(([description, data]) => ({
        description: description.length > 30 ? description.substring(0, 30) + '...' : description,
        ...data
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top 10 Spese</CardTitle>
            <CardDescription>Le spese più frequenti per importo totale</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'top10expenses' ? null : 'top10expenses')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={expandedChart === 'top10expenses' ? 500 : 350}>
          <BarChart data={top10ExpensesData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                if (isVisible) {
                  return `€${(value / 1000).toFixed(0)}k`;
                }
                return '***k';
              }}
            />
            <YAxis 
              type="category" 
              dataKey="description" 
              width={120}
              tick={{ fontSize: 10 }}
            />
            <Tooltip 
              formatter={(value, name) => {
                switch(name) {
                  case 'amount': {
                    const formattedValue = isVisible 
                      ? `€${Number(value).toLocaleString('it-IT')}` 
                      : '€●●●.●●';
                    return [formattedValue, 'Importo Totale'];
                  }
                  case 'count': return [`${value} volte`, 'Frequenza'];
                  default: return [value, name];
                }
              }}
              labelFormatter={(label) => `Descrizione: ${label}`}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#cbd5e1', fontWeight: '600' }}
            />
            <Bar dataKey="amount" fill="#8884d8" name="amount" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}