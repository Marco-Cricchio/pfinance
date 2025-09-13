'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ParetoItem {
  category: string;
  amount: number;
  percentage: number;
  cumulativePercentage: number;
  count: number;
  isVital: boolean;
}

interface ParetoChartProps {
  data: ParetoItem[];
  threshold: number;
  obfuscateAmount?: (amount: number) => string;
}

export function ParetoChart({ data, threshold, obfuscateAmount }: ParetoChartProps) {
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

  // Prepara i dati con nomi corti per il grafico
  const chartData = data.map(item => ({
    ...item,
    shortCategory: item.category.length > 12 ? item.category.substring(0, 12) + '...' : item.category
  }));

  return (
    <div className="bg-slate-900 rounded-lg p-4">
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="shortCategory"
            angle={-45}
            textAnchor="end"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            height={80}
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
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
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={[0, 100]} 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(value) => `${value}%`}
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
          />
        
        {/* Linea di riferimento per la soglia 80% */}
        <ReferenceLine 
          yAxisId="right"
          y={threshold} 
          stroke="#ef4444" 
          strokeDasharray="5 5" 
          label={{ value: "80%", position: "top" }}
        />
        
        <Tooltip 
          formatter={(value, name) => {
            switch(name) {
              case 'amount': 
                const formattedValue = obfuscateAmount 
                  ? obfuscateAmount(Number(value))
                  : `€${Number(value).toLocaleString('it-IT')}`;
                return [formattedValue, 'Importo Speso'];
              case 'cumulativePercentage': 
                return [`${Number(value).toFixed(1)}%`, 'Percentuale Cumulativa'];
              case 'percentage':
                return [`${Number(value).toFixed(1)}%`, 'Percentuale Categoria'];
              default: 
                return [value, name];
            }
          }}
          labelFormatter={(label, payload) => {
            if (payload && payload[0]) {
              const data = payload[0].payload;
              return `${data.category} ${data.isVital ? '🎯' : ''}`;
            }
            return label;
          }}
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
            color: '#f8fafc'
          }}
          itemStyle={{ color: '#f8fafc' }}
          labelStyle={{ color: '#cbd5e1', fontWeight: '600' }}
        />
        
        {/* Barre per gli importi */}
        <Bar 
          yAxisId="left"
          dataKey="amount" 
          fill="#3b82f6"
          name="amount"
        />
        
        {/* Linea per la percentuale cumulativa */}
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="cumulativePercentage" 
          stroke="#ef4444" 
          strokeWidth={3}
          name="cumulativePercentage"
          dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  );
}