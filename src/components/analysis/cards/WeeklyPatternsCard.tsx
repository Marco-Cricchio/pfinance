'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

// Il campo date ora contiene già la data valuta

interface WeeklyPatternsCardProps {
  transactions: Transaction[];
}

interface DayPattern {
  day: string;
  dayName: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
}

interface HourPattern {
  hour: number;
  totalAmount: number;
  transactionCount: number;
  topCategories: Array<{ category: string; amount: number; count: number }>;
}

// Funzione per estrarre l'orario dalla descrizione della transazione
const extractTimeFromDescription = (description: string): { hour: number; minute: number } | null => {
  if (!description) return null;
  
  const desc = description.toLowerCase();
  
  // Pattern per orari in formato HH:MM o HH.MM
  const timePatterns = [
    /\b(\d{1,2})[:.;,](\d{2})\b/g,           // 14:30, 14.30, 14;30, 14,30
    /\bore\s*(\d{1,2})[:.;,](\d{2})/g,      // ore 14:30, ore 14.30
    /\balle\s*(\d{1,2})[:.;,](\d{2})/g,     // alle 14:30, alle 14.30
    /\b(\d{1,2})[:.](\d{2})\s*h/g,          // 14:30h, 14.30h
    /\b(\d{1,2})\s*[:.](\d{2})/g,           // 14 :30, 14 .30
  ];
  
  for (const pattern of timePatterns) {
    const matches = Array.from(desc.matchAll(pattern));
    for (const match of matches) {
      const hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      
      // Validazione orario
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hour, minute };
      }
    }
  }
  
  // Pattern per orari senza minuti (es: "ore 14", "alle 15")
  const hourOnlyPatterns = [
    /\bore\s*(\d{1,2})\b/g,                 // ore 14
    /\balle\s*(\d{1,2})\b/g,               // alle 15
    /\b(\d{1,2})\s*h\b/g,                  // 14h
    /\bh\s*(\d{1,2})\b/g,                  // h 14
  ];
  
  for (const pattern of hourOnlyPatterns) {
    const matches = Array.from(desc.matchAll(pattern));
    for (const match of matches) {
      const hour = parseInt(match[1]);
      
      // Validazione orario
      if (hour >= 0 && hour <= 23) {
        return { hour, minute: 0 };
      }
    }
  }
  
  return null;
};

export function WeeklyPatternsCard({ transactions }: WeeklyPatternsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'days' | 'hours'>('days');
  const { obfuscateAmount } = useAmountVisibility();

  const weeklyPatterns = useMemo(() => {
    if (!transactions.length) return { dayPatterns: [], hourPatterns: [] };

    const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const dayData: Record<number, { total: number; count: number }> = {};
    const hourData: Record<number, { total: number; count: number; categories: Record<string, { amount: number; count: number }> }> = {};

    // Inizializza i dati
    for (let i = 0; i < 7; i++) dayData[i] = { total: 0, count: 0 };
    for (let i = 0; i < 24; i++) hourData[i] = { total: 0, count: 0, categories: {} };

    // Contatori per debug
    let extractedTimeCount = 0;
    let defaultTimeCount = 0;

    transactions.forEach(transaction => {
      if (transaction.type === 'expense') {
        const date = new Date(transaction.date);
        const dayOfWeek = (date.getDay() + 6) % 7; // Converti domenica=0 in lunedì=0
        
        // Prova a estrarre l'orario dalla descrizione
        const extractedTime = extractTimeFromDescription(transaction.description);
        let hour = 0; // Default 00:00 se non trovato
        
        if (extractedTime) {
          hour = extractedTime.hour;
          extractedTimeCount++;
        } else {
          // Fallback: usa l'orario dalla data se presente (anche se generalmente sarà 00:00)
          hour = date.getHours();
          defaultTimeCount++;
        }

        dayData[dayOfWeek].total += transaction.amount;
        dayData[dayOfWeek].count += 1;

        hourData[hour].total += transaction.amount;
        hourData[hour].count += 1;
        
        // Aggiungi la categoria per questa ora
        const category = transaction.category || 'Altro';
        if (!hourData[hour].categories[category]) {
          hourData[hour].categories[category] = { amount: 0, count: 0 };
        }
        hourData[hour].categories[category].amount += transaction.amount;
        hourData[hour].categories[category].count += 1;
      }
    });

    // Log per debug (solo in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Pattern Settimanali - Orari estratti dalle descrizioni: ${extractedTimeCount}/${extractedTimeCount + defaultTimeCount}`);
    }

    const dayPatterns: DayPattern[] = Object.entries(dayData).map(([dayIndex, data]) => ({
      day: dayIndex,
      dayName: dayNames[parseInt(dayIndex)],
      totalAmount: data.total,
      transactionCount: data.count,
      averageAmount: data.count > 0 ? data.total / data.count : 0
    }));

    const hourPatterns: HourPattern[] = Object.entries(hourData).map(([hour, data]) => {
      // Calcola le top 5 categorie per questa ora
      const sortedCategories = Object.entries(data.categories)
        .map(([category, categoryData]) => ({
          category,
          amount: categoryData.amount,
          count: categoryData.count
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        hour: parseInt(hour),
        totalAmount: data.total,
        transactionCount: data.count,
        topCategories: sortedCategories
      };
    });

    return { dayPatterns, hourPatterns };
  }, [transactions]);

  const stats = useMemo(() => {
    const { dayPatterns } = weeklyPatterns;
    
    if (!dayPatterns.length) return null;

    const mostExpensiveDay = dayPatterns.reduce((max, day) => day.totalAmount > max.totalAmount ? day : max);
    const mostActiveDay = dayPatterns.reduce((max, day) => day.transactionCount > max.transactionCount ? day : max);
    const leastExpensiveDay = dayPatterns.reduce((min, day) => day.totalAmount < min.totalAmount ? day : min);
    
    const totalWeeklySpend = dayPatterns.reduce((sum, day) => sum + day.totalAmount, 0);
    const averageDailySpend = totalWeeklySpend / 7;

    return {
      mostExpensiveDay,
      mostActiveDay,
      leastExpensiveDay,
      averageDailySpend,
      totalWeeklySpend
    };
  }, [weeklyPatterns]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🗓️</span>
              Pattern Settimanali
            </CardTitle>
            <CardDescription>
              Analizza le tue abitudini di spesa durante la settimana e negli orari del giorno
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
        {stats && (
          <>
            {/* Statistiche chiave */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-red-900/20 border border-red-600 rounded-lg">
                <div className="text-lg font-bold text-red-100">
                  {stats.mostExpensiveDay.dayName}
                </div>
                <div className="text-xs text-red-200 mt-1">
                  {obfuscateAmount(stats.mostExpensiveDay.totalAmount)}
                </div>
                <div className="text-xs text-red-300">Giorno più costoso</div>
              </div>
              <div className="text-center p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
                <div className="text-lg font-bold text-blue-100">
                  {stats.mostActiveDay.dayName}
                </div>
                <div className="text-xs text-blue-200 mt-1">
                  {stats.mostActiveDay.transactionCount} transazioni
                </div>
                <div className="text-xs text-blue-300">Giorno più attivo</div>
              </div>
              <div className="text-center p-3 bg-green-900/20 border border-green-600 rounded-lg">
                <div className="text-lg font-bold text-green-100">
                  {stats.leastExpensiveDay.dayName}
                </div>
                <div className="text-xs text-green-200 mt-1">
                  {obfuscateAmount(stats.leastExpensiveDay.totalAmount)}
                </div>
                <div className="text-xs text-green-300">Giorno più economico</div>
              </div>
              <div className="text-center p-3 bg-purple-900/20 border border-purple-600 rounded-lg">
                <div className="text-2xl font-bold text-purple-100">
                  {obfuscateAmount(stats.averageDailySpend)}
                </div>
                <div className="text-xs text-purple-200 mt-1">Media Giornaliera</div>
              </div>
            </div>

            {/* Toggle visualizzazione */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={viewMode === 'days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('days')}
              >
                Per Giorno
              </Button>
              <Button
                variant={viewMode === 'hours' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('hours')}
              >
                Per Ora
              </Button>
            </div>

            {/* Grafico */}
            <div className={`${expanded ? 'h-96' : 'h-80'}`}>
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'days' ? (
                  <BarChart data={weeklyPatterns.dayPatterns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="dayName" 
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={12}
                      tickFormatter={(value) => {
                        const testResult = obfuscateAmount(1000);
                        const isVisible = !testResult.includes('●');
                        if (isVisible) {
                          return `€${(value / 1000).toFixed(0)}k`;
                        }
                        return '***k';
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                      formatter={(value, name) => {
                        if (name === 'totalAmount') {
                          const formattedValue = obfuscateAmount(Number(value));
                          return [formattedValue, 'Spesa Totale'];
                        }
                        if (name === 'transactionCount') return [value, 'N° Transazioni'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="totalAmount" fill="#ef4444" name="totalAmount" />
                  </BarChart>
                ) : (
                  <LineChart data={weeklyPatterns.hourPatterns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(hour) => `${hour}:00`}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={12}
                      tickFormatter={(value) => {
                        const testResult = obfuscateAmount(1000);
                        const isVisible = !testResult.includes('●');
                        if (isVisible) {
                          return `€${(value / 1000).toFixed(0)}k`;
                        }
                        return '***k';
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        maxWidth: '300px'
                      }}
                      formatter={(value, name) => {
                        if (name === 'totalAmount') {
                          const formattedValue = obfuscateAmount(Number(value));
                          return [formattedValue, 'Spesa Totale'];
                        }
                        if (name === 'transactionCount') return [value, 'N° Transazioni'];
                        return [value, name];
                      }}
                      labelFormatter={(hour) => `Ora: ${hour}:00`}
                      content={(props) => {
                        if (!props.active || !props.payload || !props.payload[0]) return null;
                        
                        const data = props.payload[0].payload;
                        const hourData = weeklyPatterns.hourPatterns.find(h => h.hour === data.hour);
                        
                        if (!hourData) return null;
                        
                        return (
                          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
                            <div className="font-semibold text-slate-200 mb-2">
                              Ora: {hourData.hour}:00
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="text-slate-300">
                                <span className="font-medium">Spesa Totale:</span> {obfuscateAmount(hourData.totalAmount)}
                              </div>
                              <div className="text-slate-300">
                                <span className="font-medium">Transazioni:</span> {hourData.transactionCount}
                              </div>
                              {hourData.topCategories.length > 0 && (
                                <div className="mt-3">
                                  <div className="font-medium text-slate-200 mb-1">Top Categorie:</div>
                                  <div className="space-y-1">
                                    {hourData.topCategories.map((cat, index) => (
                                      <div key={cat.category} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">
                                          {index + 1}. {cat.category}
                                        </span>
                                        <div className="text-slate-300">
                                          {obfuscateAmount(cat.amount)} <span className="text-slate-500">({cat.count}x)</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalAmount" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="totalAmount"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Insights */}
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
              <h5 className="font-medium text-slate-200 mb-2">💡 Pattern Identificati</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-400">
                <div>
                  <strong className="text-slate-300">Giorno più costoso:</strong> {stats.mostExpensiveDay.dayName} con {obfuscateAmount(stats.mostExpensiveDay.totalAmount)}
                </div>
                <div>
                  <strong className="text-slate-300">Giorno più attivo:</strong> {stats.mostActiveDay.dayName} con {stats.mostActiveDay.transactionCount} transazioni
                </div>
                <div>
                  <strong className="text-slate-300">Variazione settimanale:</strong> {(((stats.mostExpensiveDay.totalAmount - stats.leastExpensiveDay.totalAmount) / stats.averageDailySpend) * 100).toFixed(0)}% di differenza
                </div>
                <div>
                  <strong className="text-slate-300">Media giornaliera:</strong> {obfuscateAmount(stats.averageDailySpend)} al giorno
                </div>
              </div>
            </div>
          </>
        )}

        {!stats && (
          <div className="text-center text-slate-400 py-8">
            <span className="text-4xl block mb-2">📊</span>
            <p>Nessun dato disponibile per l'analisi dei pattern settimanali</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}