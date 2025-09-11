'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface AmountFrequencyChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface AmountFrequencyItem {
  amount: number;
  frequency: number;
  category: string;
}

export function AmountFrequencyChart({ transactions, expandedChart, setExpandedChart }: AmountFrequencyChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  const amountFrequencyData = useMemo<AmountFrequencyItem[]>(() => {
    if (!transactions.length) return [];

    const amountMap = new Map<number, { frequency: number; category: string }>();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const roundedAmount = Math.round(transaction.amount / 10) * 10; // Raggruppa per decine
        const current = amountMap.get(roundedAmount) || { frequency: 0, category: transaction.category || 'Altro' };
        amountMap.set(roundedAmount, {
          frequency: current.frequency + 1,
          category: transaction.category || 'Altro'
        });
      });

    return Array.from(amountMap.entries())
      .map(([amount, data]) => ({
        amount,
        frequency: data.frequency,
        category: data.category
      }))
      .filter(item => item.frequency >= 2) // Mostra solo importi che ricorrono almeno 2 volte
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 50); // Limita a 50 punti per non sovraccaricare il grafico
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Frequenza per Importo</CardTitle>
            <CardDescription>Relazione tra importo delle spese e frequenza</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'frequency' ? null : 'frequency')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={expandedChart === 'frequency' ? 500 : 350}>
          <ScatterChart 
            data={amountFrequencyData}
            margin={{ top: 20, right: 20, bottom: 60, left: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              type="number" 
              dataKey="amount" 
              name="Importo"
              unit="€"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={(value) => obfuscateAmount(value)}
              axisLine={{ stroke: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
            />
            <YAxis 
              type="number" 
              dataKey="frequency" 
              name="Frequenza"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
              label={{ value: 'Frequenza', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9ca3af' } }}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3', stroke: '#60a5fa' }}
              formatter={(value, name) => {
                switch(name) {
                  case 'frequency': return [`${value} volte`, 'Frequenza'];
                  default: return [value, name];
                }
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload[0]) {
                  const formattedAmount = obfuscateAmount(payload[0].payload.amount);
                  return `Importo: ${formattedAmount} - Categoria: ${payload[0].payload.category}`;
                }
                const formattedAmount = obfuscateAmount(Number(value));
                return `Importo: ${formattedAmount}`;
              }}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#cbd5e1', fontWeight: '600' }}
            />
            <Scatter 
              name="frequency" 
              fill="#60a5fa" 
              stroke="#3b82f6"
              strokeWidth={1}
              r={6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}