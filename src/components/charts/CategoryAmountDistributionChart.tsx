'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface CategoryAmountDistributionChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface CategoryAmountItem {
  category: string;
  totalAmount: number;
  averageAmount: number;
  transactionCount: number;
}

export function CategoryAmountDistributionChart({ transactions, expandedChart, setExpandedChart }: CategoryAmountDistributionChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  const categoryAmountData = useMemo<CategoryAmountItem[]>(() => {
    if (!transactions.length) return [];

    const categoryMap = new Map<string, { totalAmount: number; count: number }>();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = transaction.category || 'Altro';
        const current = categoryMap.get(category) || { totalAmount: 0, count: 0 };
        categoryMap.set(category, {
          totalAmount: current.totalAmount + transaction.amount,
          count: current.count + 1
        });
      });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category: category.length > 12 ? category.substring(0, 12) + '...' : category,
        totalAmount: data.totalAmount,
        averageAmount: data.totalAmount / data.count,
        transactionCount: data.count
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8); // Limita a 8 categorie per leggibilità
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Distribuzione Importi per Categoria</CardTitle>
            <CardDescription>Importo totale e medio per categoria</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'categoryamount' ? null : 'categoryamount')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={expandedChart === 'categoryamount' ? 500 : 350}>
          <ComposedChart data={categoryAmountData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="category" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11 }}
            />
            <YAxis yAxisId="left" 
              tickFormatter={(value) => {
                if (isVisible) {
                  return `€${(value / 1000).toFixed(0)}k`;
                }
                return '***k';
              }}
            />
            <YAxis yAxisId="right" orientation="right"
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
                  case 'totalAmount': {
                    const formattedValue = isVisible 
                      ? `€${Number(value).toLocaleString('it-IT')}` 
                      : '€●●●.●●';
                    return [formattedValue, 'Importo Totale'];
                  }
                  case 'averageAmount': {
                    const formattedValue = isVisible 
                      ? `€${Number(value).toLocaleString('it-IT')}` 
                      : '€●●●.●●';
                    return [formattedValue, 'Importo Medio'];
                  }
                  case 'transactionCount': return [`${value} transazioni`, 'Numero Transazioni'];
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
            <Bar 
              yAxisId="left" 
              dataKey="totalAmount" 
              fill="#8884d8" 
              name="totalAmount"
              opacity={0.8}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="averageAmount" 
              stroke="#ff7300" 
              strokeWidth={3}
              name="averageAmount"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}