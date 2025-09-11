'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { useParetoAnalysis } from '@/hooks/analysis/useParetoAnalysis';
import { ParetoChart } from '../charts/ParetoChart';
import { InsightsList } from '../insights/InsightsList';
import { useState } from 'react';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface ParetoAnalysisCardProps {
  transactions: Transaction[];
}

export function ParetoAnalysisCard({ transactions }: ParetoAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { obfuscateAmount } = useAmountVisibility();
  const { paretoData, insights, vitalCategories, totalExpenses, paretoThreshold } = useParetoAnalysis(transactions);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              Analisi Pareto (80/20)
            </CardTitle>
            <CardDescription>
              Il 20% delle tue categorie di spesa rappresenta l'80% del tuo budget totale
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
        {/* Statistiche Pareto */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
            <div className="text-2xl font-bold text-blue-100">
              {vitalCategories.length}
            </div>
            <div className="text-sm text-blue-200 mt-1">Categorie Vitali</div>
            <div className="text-xs text-blue-300 mt-1">
              ({((vitalCategories.length / paretoData.length) * 100).toFixed(0)}% del totale)
            </div>
          </div>
          <div className="text-center p-4 bg-red-900/20 border border-red-600 rounded-lg">
            <div className="text-2xl font-bold text-red-100">
              {paretoThreshold}%
            </div>
            <div className="text-sm text-red-200 mt-1">Spese Concentrate</div>
            <div className="text-xs text-red-300 mt-1">
              nelle categorie vitali
            </div>
          </div>
          <div className="text-center p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <div className="text-xl font-bold text-green-100">
              {obfuscateAmount(totalExpenses * 0.05)}
            </div>
            <div className="text-sm text-green-200 mt-1">Risparmio Potenziale</div>
            <div className="text-xs text-green-300 mt-1">
              con riduzione 5%
            </div>
          </div>
        </div>

        {/* Categorie Vitali */}
        <div className="space-y-3">
          <h5 className="font-medium text-slate-200 flex items-center gap-2">
            🏆 Categorie Vitali (Top {((vitalCategories.length / paretoData.length) * 100).toFixed(0)}%)
          </h5>
          <div className="flex flex-wrap gap-2">
            {vitalCategories.map((category) => (
              <Badge
                key={category.category}
                variant="default"
                className="bg-red-900/30 text-red-100 hover:bg-red-900/50 border border-red-600"
              >
                {category.category} ({category.percentage.toFixed(0)}%)
              </Badge>
            ))}
          </div>
          {vitalCategories.length === 0 && (
            <p className="text-sm text-slate-400 italic">
              Nessuna categoria vitale identificata - distribuizione equilibrata delle spese
            </p>
          )}
        </div>

        {/* Grafico Pareto */}
        <div className={`${expanded ? 'h-96' : 'h-80'}`}>
          <ParetoChart 
            data={paretoData} 
            threshold={paretoThreshold}
            obfuscateAmount={obfuscateAmount}
          />
        </div>

        {/* Spiegazione del principio */}
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
          <h5 className="font-medium text-slate-200 mb-2">📚 Principio di Pareto</h5>
          <p className="text-sm text-slate-400">
            Il principio 80/20 indica che circa il 20% delle cause produce l'80% degli effetti. 
            Nel tuo caso, poche categorie di spesa concentrano la maggior parte del tuo budget. 
            Concentrati su queste per ottenere il massimo impatto sui tuoi risparmi.
          </p>
        </div>

        {/* Insights automatici */}
        <InsightsList insights={insights} obfuscateAmount={obfuscateAmount} />
      </CardContent>
    </Card>
  );
}