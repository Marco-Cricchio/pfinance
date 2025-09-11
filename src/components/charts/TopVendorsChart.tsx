'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface TopVendorsChartProps {
  transactions: Transaction[];
  expandedChart: string | null;
  setExpandedChart: (chart: string | null) => void;
}

interface VendorItem {
  vendor: string;
  amount: number;
  count: number;
}

export function TopVendorsChart({ transactions, expandedChart, setExpandedChart }: TopVendorsChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  const topVendorsData = useMemo<VendorItem[]>(() => {
    if (!transactions.length) return [];

    const vendorMap = new Map<string, { amount: number; count: number }>();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const vendor = transaction.description.split(' ')[0] || 'Sconosciuto';
        const current = vendorMap.get(vendor) || { amount: 0, count: 0 };
        vendorMap.set(vendor, {
          amount: current.amount + transaction.amount,
          count: current.count + 1
        });
      });

    return Array.from(vendorMap.entries())
      .map(([vendor, data]) => ({
        vendor: vendor.length > 15 ? vendor.substring(0, 15) + '...' : vendor,
        ...data
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Fornitori</CardTitle>
            <CardDescription>I fornitori con maggiori spese</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedChart(expandedChart === 'topvendors' ? null : 'topvendors')}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={expandedChart === 'topvendors' ? 500 : 350}>
          <BarChart data={topVendorsData} layout="vertical">
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
              dataKey="vendor" 
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
                  case 'count': return [`${value} transazioni`, 'Frequenza'];
                  default: return [value, name];
                }
              }}
              labelFormatter={(label) => `Fornitore: ${label}`}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#cbd5e1', fontWeight: '600' }}
            />
            <Bar dataKey="amount" fill="#82ca9d" name="amount" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}