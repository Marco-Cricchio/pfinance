'use client';

import { useState, useEffect } from 'react';
import { ChatBox } from '@/components/ChatBox';
import { Sparkles, Bot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParsedData } from '@/types/transaction';

export default function InsightsPage() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
          const data = await response.json();
          setParsedData(data);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div className="space-y-6">
        {/* Welcome Alert */}
        <div className="bg-blue-900/20 border border-blue-600 p-6 flex items-start gap-4">
          <Bot className="h-6 w-6 text-blue-400 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-100 mb-2">Consulente Finanziario AI Interattivo</h3>
            <p className="text-blue-200 text-sm">Chatta liberamente con il tuo consulente finanziario AI. Fai domande sui tuoi dati, ricevi consigli personalizzati e analisi dettagliate.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5 text-blue-400" />
                Chat Interattiva
              </CardTitle>
              <CardDescription>Conversazione in tempo reale</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Domande in linguaggio naturale
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Risposte in tempo reale
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Conversazione continua
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-green-400" />
                Streaming AI
              </CardTitle>
              <CardDescription>Analisi in tempo reale</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Risposte che appaiono gradualmente
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Analisi pattern di spesa
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Consigli personalizzati
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                🎯
                Context-Aware
              </CardTitle>
              <CardDescription>Accesso ai tuoi dati</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  Analisi delle transazioni
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  Breakdown per categoria
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  Trend finanziari
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-blue-900/10 to-green-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              Esempio di Conversazione AI
            </CardTitle>
            <CardDescription>Ecco come interagire con il tuo consulente finanziario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-900/10 border border-blue-600/20 rounded">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center text-sm font-semibold rounded">👤</div>
                  <div>
                    <div className="font-medium text-sm mb-1">Tu: &quot;Quanto spendo in ristoranti?&quot;</div>
                    <div className="text-muted-foreground text-xs">Domanda diretta sui tuoi pattern di spesa</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-slate-700/20 border border-slate-600/20 rounded">
                <div className="flex items-start gap-3">
                  <div className="bg-slate-700 text-slate-100 w-8 h-8 flex items-center justify-center text-sm font-semibold rounded">🤖</div>
                  <div>
                    <div className="font-medium text-sm mb-1">AI: &quot;Hai speso €347 in ristoranti questo mese...&quot;</div>
                    <div className="text-muted-foreground text-xs">Risposta dettagliata con dati specifici dai tuoi movimenti</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-900/10 border border-green-600/20 rounded">
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white w-8 h-8 flex items-center justify-center text-sm font-semibold rounded">✨</div>
                  <div>
                    <div className="font-medium text-sm mb-1">Conversazione Continua</div>
                    <div className="text-muted-foreground text-xs">Fai domande di follow-up, chiedi consigli specifici, analizza trend</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="bg-blue-900/20 border border-blue-600 p-4 flex items-center gap-3 flex-1 mr-4">
          <div className="bg-blue-400/10 p-2 rounded">
            <Bot className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-blue-100 text-sm">Chat Finanziario Attivo</div>
            <div className="text-blue-200 text-xs">
              Consulente AI con accesso a {parsedData.transactions.length} transazioni
            </div>
          </div>
        </div>
      </div>

      {/* AI ChatBox Component */}
      <ChatBox userId="default_user" maxHeight="700px" />
    </div>
  );
}