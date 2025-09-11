'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface SpendingProfileChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface SpendingProfileItem {
  subject: string;
  value: number;
  fullMark: number;
}

export function SpendingProfileChart({ transactions, expandedChart, setExpandedChart }: SpendingProfileChartProps) {
  const { obfuscateAmount } = useAmountVisibility();
  const spendingProfileData = useMemo<SpendingProfileItem[]>(() => {
    if (!transactions.length) return [];

    const categoryAmounts = new Map<string, number>();
    
    // Calcola gli importi per categoria (usa le categorie reali dai dati)
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = transaction.category || 'Altro';
        categoryAmounts.set(category, (categoryAmounts.get(category) || 0) + transaction.amount);
      });

    // Prende le top 6 categorie per importo
    const sortedCategories = Array.from(categoryAmounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6);
    
    if (sortedCategories.length === 0) return [];

    // Trova il valore massimo per normalizzare
    const maxValue = Math.max(...sortedCategories.map(([, amount]) => amount));
    
    return sortedCategories.map(([category, amount]) => ({
      subject: category,
      value: amount,
      fullMark: maxValue || 1
    }));
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profilo di Spesa</CardTitle>
            <CardDescription>Radar delle categorie di spesa principali</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'profile' ? null : 'profile')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {spendingProfileData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <span className="text-4xl block mb-2">📊</span>
              <p>Nessun dato di spesa disponibile</p>
            </div>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={expandedChart === 'profile' ? 500 : 300}>
          <RadarChart data={spendingProfileData}>
            <PolarGrid stroke="#4a5568" strokeWidth={1} />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#e2e8f0' }} />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, spendingProfileData[0]?.fullMark || 1]}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => {
                const testResult = obfuscateAmount(1000);
                const isVisible = !testResult.includes('●');
                if (isVisible) {
                  return `€${(value / 1000).toFixed(0)}k`;
                }
                return '***k';
              }}
            />
            <Radar
              name="Spesa"
              dataKey="value"
              stroke="#4ECDC4"
              fill="#4ECDC4"
              fillOpacity={0.2}
              strokeWidth={3}
              dot={{ fill: '#4ECDC4', strokeWidth: 2, r: 4 }}
            />
            <Tooltip 
              formatter={(value, name) => {
                switch(name) {
                  case 'Spesa': {
                    const formattedValue = obfuscateAmount(Number(value));
                    return [formattedValue, 'Importo Speso'];
                  }
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
          </RadarChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}