'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface WeeklySpendingChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface WeeklySpendingItem {
  day: string;
  expenses: number;
  count: number;
  average: number;
}

export function WeeklySpendingChart({ transactions, expandedChart, setExpandedChart }: WeeklySpendingChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  const weeklySpendingData = useMemo<WeeklySpendingItem[]>(() => {
    if (!transactions.length) return [];
    
    const daysMap = {
      0: 'Domenica', 1: 'Lunedì', 2: 'Martedì', 3: 'Mercoledì',
      4: 'Giovedì', 5: 'Venerdì', 6: 'Sabato'
    };
    
    const weekData = Array.from({ length: 7 }, (_, i) => ({
      day: daysMap[i as keyof typeof daysMap],
      expenses: 0,
      count: 0,
      average: 0
    }));
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const dayOfWeek = new Date(transaction.date).getDay();
        weekData[dayOfWeek].expenses += transaction.amount;
        weekData[dayOfWeek].count += 1;
      });

    return weekData.map(item => ({
      ...item,
      average: item.count > 0 ? item.expenses / item.count : 0
    }));
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Spese per Giorno</CardTitle>
            <CardDescription>Distribuzione delle spese per giorno della settimana</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'weekly' ? null : 'weekly')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={expandedChart === 'weekly' ? 500 : 300}>
          <BarChart data={weeklySpendingData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
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
                switch(name) {
                  case 'expenses': {
                    const formattedValue = isVisible 
                      ? `€${Number(value).toLocaleString('it-IT')}` 
                      : '€●●●.●●';
                    return [formattedValue, 'Spese Totali'];
                  }
                  case 'count': return [`${value} transazioni`, 'Numero Transazioni'];
                  case 'average': {
                    const formattedValue = isVisible 
                      ? `€${Number(value).toLocaleString('it-IT')}` 
                      : '€●●●.●●';
                    return [formattedValue, 'Spesa Media'];
                  }
                  default: return [value, name];
                }
              }}
              labelFormatter={(label) => `Giorno: ${label}`}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#cbd5e1', fontWeight: '600' }}
            />
            <Bar dataKey="expenses" fill="#82ca9d" name="expenses" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}