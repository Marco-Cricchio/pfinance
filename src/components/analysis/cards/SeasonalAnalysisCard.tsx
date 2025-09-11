'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useSeasonalAnalysis } from '@/hooks/analysis/useSeasonalAnalysis';
import { SeasonalTrendsChart } from '../charts/SeasonalTrendsChart';
import { InsightsList } from '../insights/InsightsList';
import { useState } from 'react';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface SeasonalAnalysisCardProps {
  transactions: Transaction[];
}

export function SeasonalAnalysisCard({ transactions }: SeasonalAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { obfuscateAmount } = useAmountVisibility();
  const { monthlyData, insights, seasonalTrends } = useSeasonalAnalysis(transactions);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🗓️</span>
              Analisi Stagionale
            </CardTitle>
            <CardDescription>
              Identifica pattern ricorrenti nelle tue spese durante l'anno per anticipare picchi di costo
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiche chiave */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
            <div className="text-2xl font-bold text-blue-100">
              {obfuscateAmount(seasonalTrends.averageMonthly)}
            </div>
            <div className="text-xs text-blue-200 mt-1">Media Mensile</div>
          </div>
          <div className="text-center p-3 bg-red-900/20 border border-red-600 rounded-lg">
            <div className="text-2xl font-bold text-red-100">
              {obfuscateAmount(seasonalTrends.highestMonth.amount)}
            </div>
            <div className="text-xs text-red-200 mt-1">Picco Massimo</div>
          </div>
          <div className="text-center p-3 bg-green-900/20 border border-green-600 rounded-lg">
            <div className="text-2xl font-bold text-green-100">
              {obfuscateAmount(seasonalTrends.lowestMonth.amount)}
            </div>
            <div className="text-xs text-green-200 mt-1">Minimo</div>
          </div>
          <div className="text-center p-3 bg-purple-900/20 border border-purple-600 rounded-lg">
            <div className="text-lg font-bold text-purple-100">
              {(((seasonalTrends.highestMonth.amount - seasonalTrends.lowestMonth.amount) / seasonalTrends.averageMonthly) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-purple-200 mt-1">Variabilità</div>
          </div>
        </div>

        {/* Grafico */}
        <div className={`${expanded ? 'h-96' : 'h-80'}`}>
          <SeasonalTrendsChart 
            data={monthlyData} 
            averageMonthly={seasonalTrends.averageMonthly}
            obfuscateAmount={obfuscateAmount}
          />
        </div>

        {/* Pattern stagionale */}
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
          <h5 className="font-medium text-slate-200 mb-2">📊 Pattern Identificato</h5>
          <p className="text-sm text-slate-400">{seasonalTrends.seasonality}</p>
        </div>

        {/* Insights automatici */}
        <InsightsList insights={insights} obfuscateAmount={obfuscateAmount} />
      </CardContent>
    </Card>
  );
}