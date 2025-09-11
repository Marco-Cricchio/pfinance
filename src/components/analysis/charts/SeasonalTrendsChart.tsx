'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MonthlyData {
  month: string;
  monthIndex: number;
  year: number;
  totalExpenses: number;
  totalIncome: number;
  netFlow: number;
  transactionCount: number;
}

interface SeasonalTrendsChartProps {
  data: MonthlyData[];
  averageMonthly: number;
  obfuscateAmount?: (amount: number) => string;
}

export function SeasonalTrendsChart({ data, averageMonthly, obfuscateAmount }: SeasonalTrendsChartProps) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-900 rounded-lg">
        <div className="text-center">
          <span className="text-4xl">📊</span>
          <p className="mt-2">Nessun dato disponibile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            angle={-45}
            textAnchor="end"
            height={60}
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(value) => {
              if (obfuscateAmount) {
                // Check if the obfuscated result contains currency symbols to determine visibility
                const testResult = obfuscateAmount(1000);
                const isVisible = !testResult.includes('●');
                if (isVisible) {
                  return `€${(value / 1000).toFixed(0)}k`;
                }
                return '***k';
              }
              return `€${(value / 1000).toFixed(0)}k`;
            }}
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
          />
        <Tooltip 
          formatter={(value, name) => {
            const formattedValue = obfuscateAmount 
              ? obfuscateAmount(Number(value))
              : `€${Number(value).toLocaleString('it-IT')}`;
            switch(name) {
              case 'totalExpenses': return [formattedValue, 'Spese Totali'];
              case 'totalIncome': return [formattedValue, 'Entrate Totali'];
              case 'netFlow': return [formattedValue, 'Flusso Netto'];
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
        <ReferenceLine 
          y={averageMonthly} 
          stroke="#9ca3af" 
          strokeDasharray="5 5" 
          label={{ value: "Media", position: "topRight", fill: '#9ca3af' }}
        />
        <Line 
          type="monotone" 
          dataKey="totalExpenses" 
          stroke="#ef4444" 
          strokeWidth={2}
          name="totalExpenses"
          dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="totalIncome" 
          stroke="#22c55e" 
          strokeWidth={2}
          name="totalIncome"
          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="netFlow" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="netFlow"
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}