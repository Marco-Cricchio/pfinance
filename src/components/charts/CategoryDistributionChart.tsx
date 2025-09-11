'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface CategoryDistributionChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface CategoryItem {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export function CategoryDistributionChart({ transactions, expandedChart, setExpandedChart }: CategoryDistributionChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  const categoryData = useMemo<CategoryItem[]>(() => {
    if (!transactions.length) return [];

    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    let totalExpenses = 0;
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = transaction.category || 'Altro';
        const current = categoryMap.get(category) || { amount: 0, count: 0 };
        categoryMap.set(category, {
          amount: current.amount + transaction.amount,
          count: current.count + 1
        });
        totalExpenses += transaction.amount;
      });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Distribuzione per Categoria</CardTitle>
            <CardDescription>Percentuale di spesa per ogni categoria</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'categories' ? null : 'categories')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={expandedChart === 'categories' ? 500 : 350}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="category" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                if (isVisible) {
                  return `€${(value / 1000).toFixed(0)}k`;
                }
                return '***k';
              }}
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
                  case 'count': return [`${value} transazioni`, 'Numero Transazioni'];
                  case 'percentage': return [`${Number(value).toFixed(1)}%`, 'Percentuale'];
                  default: return [value, name];
                }
              }}
              labelFormatter={(label) => `Categoria: ${label}`}
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