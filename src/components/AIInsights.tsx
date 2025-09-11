'use client';

import { useEffect, useState } from 'react';
import { Brain, AlertTriangle, Lightbulb, Target, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateFinancialInsights, AIInsight } from '@/lib/ai';
import { ParsedData } from '@/types/transaction';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface AIInsightsProps {
  data: ParsedData | null;
}

export function AIInsights({ data }: AIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { obfuscateAmount } = useAmountVisibility();

  const generateInsights = async () => {
    if (!data) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await generateFinancialInsights(data);
      setInsights(result);
    } catch (error: any) {
      console.error('Errore generazione insights:', error);
      setError(error.message || 'Errore sconosciuto durante la generazione dei consigli');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-blue-400" />;
      case 'suggestion':
        return <Target className="h-5 w-5 text-green-400" />;
      default:
        return <Brain className="h-5 w-5 text-purple-400" />;
    }
  };

  const getInsightBorderColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-orange-600 bg-orange-900/20';
      case 'tip':
        return 'border-blue-600 bg-blue-900/20';
      case 'suggestion':
        return 'border-green-600 bg-green-900/20';
      default:
        return 'border-purple-600 bg-purple-900/20';
    }
  };

  const obfuscateText = (text: string) => {
    if (typeof text !== 'string') {
      return text;
    }
    return text.replace(/(-?€?\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/g, (match) => {
      const number = parseFloat(match.replace(/€\s?/, '').replace(/,/, '.'));
      return obfuscateAmount(number);
    });
  };

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Suggerimenti AI
          </CardTitle>
          <CardDescription>
            Carica i tuoi dati finanziari per ricevere consigli personalizzati
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Suggerimenti AI
            </CardTitle>
            <CardDescription>
              Analisi intelligente dei tuoi dati finanziari
            </CardDescription>
          </div>
          <Button 
            onClick={generateInsights} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            {loading ? 'Analizzando...' : 'Genera Consigli'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="font-semibold text-red-700 mb-2">Servizio AI Non Disponibile</h3>
            <p className="text-red-600 mb-4 max-w-md mx-auto">
              {error}
            </p>
            <Button 
              onClick={generateInsights} 
              variant="outline" 
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <Brain className="h-4 w-4 mr-2" />
              Riprova
            </Button>
          </div>
        ) : insights.length === 0 && !loading ? (
          <div className="text-center py-8">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Analisi AI Personalizzata</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Ricevi consigli finanziari personalizzati basati sui tuoi dati reali analizzati da intelligenza artificiale avanzata.
            </p>
            <Button onClick={generateInsights} disabled={loading}>
              <Brain className="h-4 w-4 mr-2" />
              Genera Consigli AI
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getInsightBorderColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 text-slate-100">{insight.title}</h4>
                    <p className="text-sm text-slate-300">
                      {obfuscateText(insight.description)}
                    </p>
                    {insight.category && (
                      <span className="inline-block mt-2 px-2 py-1 bg-slate-700 text-slate-200 rounded-full text-xs">
                        {insight.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="text-center mt-6">
              <Button 
                onClick={generateInsights} 
                variant="outline" 
                size="sm" 
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Genera Nuovi Consigli
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}