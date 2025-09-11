import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, AlertTriangle, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Il campo date ora contiene già la data valuta

interface AnomalyDetectionCardProps {
  transactions: Transaction[];
}

interface Anomaly {
  id: string;
  transaction: Transaction;
  type: 'amount_spike' | 'frequency_spike' | 'unusual_category' | 'time_anomaly';
  severity: 'low' | 'medium' | 'high';
  score: number;
  description: string;
}

interface ScatterDataPoint {
  x: number; // giorni dall'inizio
  y: number; // importo
  transaction: Transaction;
  isAnomaly: boolean;
  severity: string;
}

export function AnomalyDetectionCard({ transactions }: AnomalyDetectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [outlierThreshold, setOutlierThreshold] = useState<number>(2);
  const { obfuscateAmount } = useAmountVisibility();

  const anomalies = useMemo(() => {
    if (!transactions.length) return [];

    // Categorie che rappresentano spese ricorrenti/prevedibili da escludere dal rilevamento anomalie
    const recurringCategories = new Set([
      'Mutuo',
      'Affitto', 
      'Assicurazioni',
      'Abbonamenti',
      'Utilities',
      'Bollette',
      'Stipendio', // nel caso sia categorizzato erroneamente come spesa
      'Rata Auto',
      'Rata Prestito',
      'Canone',
      'Abbonamento'
    ]);

    const expenseTransactions = transactions.filter(t => 
      t.type === 'expense' && !recurringCategories.has(t.category || '')
    );
    const detectedAnomalies: Anomaly[] = [];

    // 1. Anomalie di importo (spese molto sopra la media)
    const amounts = expenseTransactions.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length);
    
    expenseTransactions.forEach(transaction => {
      const zScore = (transaction.amount - avgAmount) / stdDev;
      if (zScore > outlierThreshold) {
        detectedAnomalies.push({
          id: `amount_${transaction.id}`,
          transaction,
          type: 'amount_spike',
          severity: zScore > outlierThreshold + 1 ? 'high' : zScore > outlierThreshold + 0.5 ? 'medium' : 'low',
          score: zScore,
          description: `Spesa anomala: ${obfuscateAmount(transaction.amount)} (${zScore.toFixed(1)}σ sopra la media)`
        });
      }
    });

    // 2. Anomalie di frequenza per categoria
    const categoryFrequency: Record<string, { transactions: Transaction[]; dailyAvg: number }> = {};
    expenseTransactions.forEach(transaction => {
      const category = transaction.category || 'Altro';
      if (!categoryFrequency[category]) {
        categoryFrequency[category] = { transactions: [], dailyAvg: 0 };
      }
      categoryFrequency[category].transactions.push(transaction);
    });

    // Calcola media giornaliera per categoria
    const totalDays = Math.max(1, Math.ceil((Date.now() - new Date(Math.min(...transactions.map(t => new Date(t.date).getTime()))).getTime()) / (1000 * 60 * 60 * 24)));
    
    Object.keys(categoryFrequency).forEach(category => {
      const categoryTxns = categoryFrequency[category].transactions;
      const dailyAvg = categoryTxns.length / totalDays;
      categoryFrequency[category].dailyAvg = dailyAvg;

      // Cerca giorni con frequenza anomala
      const dailyCount: Record<string, number> = {};
      categoryTxns.forEach(txn => {
        const date = new Date(txn.date).toDateString();
        dailyCount[date] = (dailyCount[date] || 0) + 1;
      });

      Object.entries(dailyCount).forEach(([date, count]) => {
        if (count > dailyAvg * 3 && count > 3) {
          const dayTransactions = categoryTxns.filter(txn => new Date(txn.date).toDateString() === date);
          dayTransactions.slice(0, 1).forEach(transaction => {
            detectedAnomalies.push({
              id: `freq_${transaction.id}`,
              transaction,
              type: 'frequency_spike',
              severity: count > dailyAvg * 5 ? 'high' : 'medium',
              score: count / dailyAvg,
              description: `Picco di frequenza: ${count} transazioni in ${category} (media: ${dailyAvg.toFixed(1)})`
            });
          });
        }
      });
    });

    // 3. Anomalie di orario (transazioni a orari inusuali)
    const hourlyActivity = new Array(24).fill(0);
    expenseTransactions.forEach(transaction => {
      const hour = new Date(transaction.date).getHours();
      hourlyActivity[hour]++;
    });

    const avgHourlyActivity = hourlyActivity.reduce((sum, count) => sum + count, 0) / 24;
    expenseTransactions.forEach(transaction => {
      const hour = new Date(transaction.date).getHours();
      const isUnusualTime = (hour < 6 || hour > 23) && hourlyActivity[hour] < avgHourlyActivity * 0.1;
      
      if (isUnusualTime && transaction.amount > avgAmount * 0.5) {
        detectedAnomalies.push({
          id: `time_${transaction.id}`,
          transaction,
          type: 'time_anomaly',
          severity: 'medium',
          score: 2,
          description: `Transazione a orario inusuale: ${hour.toString().padStart(2, '0')}:${new Date(transaction.date).getMinutes().toString().padStart(2, '0')}`
        });
      }
    });

    return detectedAnomalies.sort((a, b) => b.score - a.score);
  }, [transactions, outlierThreshold, obfuscateAmount]);

  const scatterData = useMemo<ScatterDataPoint[]>(() => {
    if (!transactions.length) return [];

    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const firstDate = new Date(Math.min(...expenseTransactions.map(t => new Date(t.date).getTime())));
    
    return expenseTransactions.map(transaction => {
      const daysDiff = Math.floor((new Date(transaction.date).getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      const anomaly = anomalies.find(a => a.transaction.id === transaction.id);
      
      return {
        x: daysDiff,
        y: transaction.amount,
        transaction,
        isAnomaly: !!anomaly,
        severity: anomaly?.severity || 'normal'
      };
    });
  }, [transactions, anomalies]);

  const filteredAnomalies = useMemo(() => {
    if (selectedType === 'all') return anomalies;
    return anomalies.filter(a => a.type === selectedType);
  }, [anomalies, selectedType]);

  const stats = useMemo(() => {
    const totalTransactions = transactions.filter(t => t.type === 'expense').length;
    const anomalyCount = anomalies.length;
    const anomalyRate = totalTransactions > 0 ? (anomalyCount / totalTransactions) * 100 : 0;
    
    const severityCounts = {
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      low: anomalies.filter(a => a.severity === 'low').length
    };

    const typeCounts = {
      amount_spike: anomalies.filter(a => a.type === 'amount_spike').length,
      frequency_spike: anomalies.filter(a => a.type === 'frequency_spike').length,
      time_anomaly: anomalies.filter(a => a.type === 'time_anomaly').length
    };

    return { anomalyRate, severityCounts, typeCounts };
  }, [anomalies, transactions]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'amount_spike': return <TrendingUp className="h-4 w-4" />;
      case 'frequency_spike': return <Zap className="h-4 w-4" />;
      case 'time_anomaly': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              Rilevamento Anomalie
            </CardTitle>
            <CardDescription>
              Identifica transazioni inusuali che potrebbero richiedere la tua attenzione
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
        {/* Statistiche principali */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-orange-900/20 border border-orange-600 rounded-lg">
            <div className="text-2xl font-bold text-orange-100">
              {anomalies.length}
            </div>
            <div className="text-xs text-orange-200 mt-1">Anomalie Rilevate</div>
          </div>
          <div className="text-center p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
            <div className="text-2xl font-bold text-blue-100">
              {stats.anomalyRate.toFixed(1)}%
            </div>
            <div className="text-xs text-blue-200 mt-1">Tasso Anomalie</div>
          </div>
          <div className="text-center p-3 bg-red-900/20 border border-red-600 rounded-lg">
            <div className="text-2xl font-bold text-red-100">
              {stats.severityCounts.high}
            </div>
            <div className="text-xs text-red-200 mt-1">Alta Priorità</div>
          </div>
          <div className="text-center p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <div className="text-2xl font-bold text-yellow-100">
              {stats.severityCounts.medium}
            </div>
            <div className="text-xs text-yellow-200 mt-1">Media Priorità</div>
          </div>
        </div>

        {/* Filtri per tipo di anomalia */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('all')}
          >
            Tutte ({anomalies.length})
          </Button>
          <Button
            variant={selectedType === 'amount_spike' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('amount_spike')}
          >
            Importi Anomali ({stats.typeCounts.amount_spike})
          </Button>
          <Button
            variant={selectedType === 'frequency_spike' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('frequency_spike')}
          >
            Picchi Frequenza ({stats.typeCounts.frequency_spike})
          </Button>
          <Button
            variant={selectedType === 'time_anomaly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('time_anomaly')}
          >
            Orari Inusuali ({stats.typeCounts.time_anomaly})
          </Button>
        </div>

        {/* Grafico scatter */}
        {scatterData.length > 0 && (
          <div className={`${expanded ? 'h-96' : 'h-64'}`}>
            <h5 className="font-medium text-slate-200 mb-2">Distribuzione Transazioni nel Tempo</h5>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="x" 
                  stroke="#9ca3af"
                  fontSize={12}
                  name="Giorni"
                />
                <YAxis 
                  dataKey="y"
                  stroke="#9ca3af" 
                  fontSize={12}
                  name="Importo"
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
                    color: '#ffffff',
                    padding: '12px',
                    minWidth: '250px'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#ffffff' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ScatterDataPoint;
                      const transaction = data.transaction;
                      const anomaly = anomalies.find(a => a.transaction.id === transaction.id);
                      
                      return (
                        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
                          <div className="space-y-2">
                            {/* Data e importo */}
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300 font-medium">
                                {new Date(transaction.date).toLocaleDateString('it-IT')}
                              </span>
                              <span className="text-lg font-bold text-white">
                                {obfuscateAmount(transaction.amount)}
                              </span>
                            </div>
                            
                            {/* Categoria */}
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-sm">Categoria:</span>
                              <span className="text-white font-medium text-sm">
                                {transaction.category || 'Altro'}
                              </span>
                            </div>
                            
                            {/* Descrizione */}
                            <div className="border-t border-slate-600 pt-2">
                              <span className="text-slate-400 text-xs">Descrizione:</span>
                              <p className="text-white text-sm mt-1 break-words">
                                {transaction.description}
                              </p>
                            </div>
                            
                            {/* Status anomalia */}
                            {anomaly ? (
                              <div className="border-t border-slate-600 pt-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs">🚨</span>
                                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                                    anomaly.severity === 'high' ? 'bg-red-900 text-red-200' :
                                    anomaly.severity === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                                    'bg-green-900 text-green-200'
                                  }`}>
                                    ANOMALIA {anomaly.severity.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300">
                                  {anomaly.description}
                                </p>
                              </div>
                            ) : (
                              <div className="border-t border-slate-600 pt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">✅</span>
                                  <span className="text-xs text-green-300">Transazione normale</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                <Scatter name="Transazioni" data={scatterData} fill="#8884d8">
                  {scatterData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isAnomaly ? getSeverityColor(entry.severity) : '#6b7280'}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legenda tipi di anomalia */}
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
          <h5 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
            <span>📋</span>
            Legenda Tipi di Anomalia
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-red-400 mt-1" />
              <div>
                <div className="font-medium text-slate-300">Importi Anomali</div>
                <div className="text-xs text-slate-400 mb-2">Spese molto superiori alla media.</div>
                <Select value={outlierThreshold.toString()} onValueChange={(value) => setOutlierThreshold(Number(value))}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Soglia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.5">Bassa (&gt;1.5σ)</SelectItem>
                    <SelectItem value="2">Media (&gt;2σ)</SelectItem>
                    <SelectItem value="2.5">Alta (&gt;2.5σ)</SelectItem>
                    <SelectItem value="3">Molto Alta (&gt;3σ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <div>
                <div className="font-medium text-slate-300">Picchi Frequenza</div>
                <div className="text-xs text-slate-400">Troppe transazioni in un giorno per categoria</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <div>
                <div className="font-medium text-slate-300">Orari Inusuali</div>
                <div className="text-xs text-slate-400">Transazioni in orari poco comuni (notte/alba)</div>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              <div className="font-medium text-slate-300 mb-1">Severità:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>Alta: &gt;{outlierThreshold + 1}σ o pattern molto rari</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span>Media: {outlierThreshold}-{outlierThreshold + 1}σ o pattern inusuali</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Bassa: lievi deviazioni</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-600">
                  <div className="font-medium text-slate-300 text-xs mb-1">ℹ️ Escluse dal rilevamento:</div>
                  <div className="text-xs text-slate-500">
                    Spese ricorrenti come Mutuo, Affitto, Assicurazioni, Bollette e Abbonamenti sono automaticamente escluse
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista anomalie */}
        {filteredAnomalies.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-medium text-slate-200">
              Anomalie Rilevate ({filteredAnomalies.length})
            </h5>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {filteredAnomalies.map((anomaly) => (
                <div key={anomaly.id} className="bg-slate-900 border border-slate-700 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(anomaly.type)}
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          anomaly.severity === 'high' ? 'border-red-600 text-red-200' :
                          anomaly.severity === 'medium' ? 'border-yellow-600 text-yellow-200' :
                          'border-green-600 text-green-200'
                        }`}
                      >
                        {anomaly.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {anomaly.type === 'amount_spike' ? 'Importo Anomalo' :
                         anomaly.type === 'frequency_spike' ? 'Picco Frequenza' :
                         anomaly.type === 'time_anomaly' ? 'Orario Inusuale' : 'Altro'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400">
                        {new Date(anomaly.transaction.date).toLocaleDateString('it-IT')}
                      </span>
                      <div className="text-xs text-slate-500">
                        {obfuscateAmount(anomaly.transaction.amount)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-300 mb-1">
                    <span className="font-medium">{anomaly.transaction.category || 'Altro'}:</span> {anomaly.transaction.description}
                  </div>
                  <div className="text-xs text-slate-400">
                    💡 {anomaly.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {anomalies.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            <span className="text-4xl block mb-2">✅</span>
            <p className="font-medium">Nessuna anomalia rilevata</p>
            <p className="text-sm">I tuoi pattern di spesa sembrano regolari</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
