'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, Target, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

// Il campo date ora contiene già la data valuta

interface EfficiencyAnalysisCardProps {
  transactions: Transaction[];
}

interface CategoryEfficiency {
  category: string;
  spent: number;
  transactionCount: number;
  averageTransaction: number;
  efficiency: number;
  trend: 'improving' | 'worsening' | 'stable';
}

interface MonthlyEfficiency {
  month: string;
  efficiency: number;
  spent: number;
  income: number;
  savingsRate: number;
}

export function EfficiencyAnalysisCard({ transactions }: EfficiencyAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'categories' | 'monthly' | 'radar'>('categories');
  const { obfuscateAmount } = useAmountVisibility();

  const efficiencyData = useMemo(() => {
    if (!transactions.length) return { categoryEfficiency: [], monthlyEfficiency: [], overallScore: 0 };

    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    
    // 1. Efficienza per categoria
    const categoryData: Record<string, { spent: number; count: number; transactions: Transaction[] }> = {};
    
    expenses.forEach(transaction => {
      const category = transaction.category || 'Altro';
      if (!categoryData[category]) {
        categoryData[category] = { spent: 0, count: 0, transactions: [] };
      }
      categoryData[category].spent += transaction.amount;
      categoryData[category].count += 1;
      categoryData[category].transactions.push(transaction);
    });

    // Calcola efficienza per categoria (basata su frequenza vs importo medio)
    const categoryEfficiency: CategoryEfficiency[] = Object.entries(categoryData).map(([category, data]) => {
      const averageTransaction = data.spent / data.count;
      const totalSpent = data.spent;
      
      // L'efficienza è inversamente proporzionale alla spesa totale e direttamente alla frequenza
      // Categorie con molte piccole transazioni sono più "efficienti"
      const efficiency = Math.min(100, (data.count / Math.sqrt(totalSpent)) * 100);
      
      // Calcola trend confrontando prime e seconde metà delle transazioni
      const sortedTxns = data.transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const midPoint = Math.floor(sortedTxns.length / 2);
      const firstHalfAvg = sortedTxns.slice(0, midPoint).reduce((sum, t) => sum + t.amount, 0) / midPoint || 0;
      const secondHalfAvg = sortedTxns.slice(midPoint).reduce((sum, t) => sum + t.amount, 0) / (sortedTxns.length - midPoint) || 0;
      
      const trend: 'improving' | 'worsening' | 'stable' = 
        secondHalfAvg < firstHalfAvg * 0.9 ? 'improving' :
        secondHalfAvg > firstHalfAvg * 1.1 ? 'worsening' : 'stable';

      return {
        category,
        spent: totalSpent,
        transactionCount: data.count,
        averageTransaction,
        efficiency,
        trend
      };
    }).sort((a, b) => b.efficiency - a.efficiency);

    // 2. Efficienza mensile
    const monthlyData: Record<string, { spent: number; income: number; month: string; date: Date }> = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
          spent: 0, 
          income: 0, 
          month: monthKey,
          date: new Date(date.getFullYear(), date.getMonth(), 1) // First day of month for sorting
        };
      }
      
      if (transaction.type === 'expense') {
        monthlyData[monthKey].spent += transaction.amount;
      } else {
        monthlyData[monthKey].income += transaction.amount;
      }
    });

    const monthlyEfficiency: MonthlyEfficiency[] = Object.values(monthlyData)
      .map(data => {
        const savingsRate = data.income > 0 ? ((data.income - data.spent) / data.income) * 100 : 0;
        const efficiency = Math.max(0, savingsRate + 50); // Normalizza tra 0-100
        
        return {
          month: data.month,
          efficiency,
          spent: data.spent,
          income: data.income,
          savingsRate
        };
      })
      .sort((a, b) => {
        // Ordina cronologicamente usando la data originale
        const dateA = monthlyData[a.month].date;
        const dateB = monthlyData[b.month].date;
        return dateA.getTime() - dateB.getTime();
      });

    // 3. Score complessivo
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const overallSavingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    const avgCategoryEfficiency = categoryEfficiency.reduce((sum, cat) => sum + cat.efficiency, 0) / categoryEfficiency.length || 0;
    const overallScore = Math.max(0, (overallSavingsRate + avgCategoryEfficiency) / 2);

    return { categoryEfficiency, monthlyEfficiency, overallScore };
  }, [transactions]);

  const radarData = useMemo(() => {
    if (!efficiencyData.categoryEfficiency.length) return [];
    
    // Prendi le top 6 categorie per il radar
    return efficiencyData.categoryEfficiency.slice(0, 6).map(cat => ({
      category: cat.category.length > 10 ? cat.category.substring(0, 10) + '...' : cat.category,
      efficiency: Math.round(cat.efficiency),
      fullName: cat.category
    }));
  }, [efficiencyData.categoryEfficiency]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 75) return '#10b981'; // emerald-500
    if (efficiency >= 50) return '#f59e0b'; // amber-500
    if (efficiency >= 25) return '#ef4444'; // red-500
    return '#8b5cf6'; // violet-500
  };

  const getPieChartColors = () => {
    const colors = [
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#06b6d4', // cyan-500
      '#84cc16', // lime-500
    ];
    return colors;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-3 w-3 text-green-400" />;
      case 'worsening': return <TrendingUp className="h-3 w-3 text-red-400 rotate-180" />;
      default: return <Target className="h-3 w-3 text-blue-400" />;
    }
  };

  const pieChartData = efficiencyData.categoryEfficiency.slice(0, 5).map(cat => ({
    name: cat.category,
    value: cat.spent,
    efficiency: cat.efficiency
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              Analisi Efficienza
            </CardTitle>
            <CardDescription>
              Misura l'efficienza delle tue spese e identifica aree di miglioramento
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
        {/* Score generale */}
        <div className="text-center p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-600 rounded-lg">
          <div className="text-4xl font-bold text-purple-100 mb-2">
            {efficiencyData.overallScore.toFixed(0)}
          </div>
          <div className="text-purple-200 font-medium mb-1">Score Efficienza Generale</div>
          <div className="text-sm text-purple-300">
            {efficiencyData.overallScore >= 75 ? 'Eccellente' :
             efficiencyData.overallScore >= 50 ? 'Buono' :
             efficiencyData.overallScore >= 25 ? 'Migliorabile' : 'Critico'}
          </div>
        </div>

        {/* Controlli visualizzazione */}
        <div className="flex justify-center gap-2">
          <Button
            variant={viewMode === 'categories' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('categories')}
          >
            Per Categoria
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('monthly')}
          >
            Mensile
          </Button>
          <Button
            variant={viewMode === 'radar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('radar')}
          >
            Tutte le Categorie
          </Button>
        </div>

        {/* Grafici dinamici */}
        <div className={`${expanded ? 'h-96' : 'h-80'}`}>
          {viewMode === 'categories' && (
            <div>
              <h5 className="font-medium text-slate-200 mb-4 text-center">Spese per Categoria</h5>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <BarChart 
                    data={efficiencyData.categoryEfficiency}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#9ca3af" 
                      fontSize={8}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={10}
                      tickFormatter={(value) => obfuscateAmount(value)}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'spent') {
                          return [obfuscateAmount(Number(value)), 'Speso'];
                        }
                        return [Number(value).toFixed(1), 'Score Efficienza'];
                      }}
                      labelFormatter={(label) => `Categoria: ${label}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f1f5f9',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        padding: '12px'
                      }}
                      itemStyle={{ 
                        color: '#f1f5f9',
                        fontWeight: '500'
                      }}
                      labelStyle={{ 
                        color: '#cbd5e1',
                        fontWeight: '600'
                      }}
                    />
                    <Bar 
                      dataKey="spent"
                      name="spent"
                    >
                      {efficiencyData.categoryEfficiency.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getPieChartColors()[index % getPieChartColors().length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {viewMode === 'monthly' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={efficiencyData.monthlyEfficiency}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'efficiency') return [`${Number(value).toFixed(1)}`, 'Score Efficienza'];
                    if (name === 'savingsRate') return [`${Number(value).toFixed(1)}%`, 'Tasso Risparmio'];
                    return [value, name];
                  }}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f8fafc'
                  }}
                />
                <Bar dataKey="efficiency" fill="#22c55e" name="efficiency" />
              </BarChart>
            </ResponsiveContainer>
          )}

          {viewMode === 'radar' && efficiencyData.categoryEfficiency.length > 0 && (
            <div>
              <h5 className="font-medium text-slate-200 mb-4 text-center">Efficienza di Tutte le Categorie</h5>
              {/* Debug info - rimuovi in produzione */}
              <div className="mb-2 text-xs text-slate-400 text-center">
                Categorie: {efficiencyData.categoryEfficiency.length} | 
                Range: {Math.min(...efficiencyData.categoryEfficiency.map(c => c.efficiency)).toFixed(1)} - {Math.max(...efficiencyData.categoryEfficiency.map(c => c.efficiency)).toFixed(1)}
              </div>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <BarChart 
                    data={efficiencyData.categoryEfficiency}
                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#9ca3af" 
                      fontSize={8}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={10}
                      domain={[0, 105]}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value).toFixed(1)}`, 
                        'Score Efficienza'
                      ]}
                      labelFormatter={(label) => `Categoria: ${label}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f1f5f9'
                      }}
                    />
                    <Bar 
                      dataKey="efficiency" 
                      fill="#8b5cf6"
                    >
                      {efficiencyData.categoryEfficiency.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getEfficiencyColor(entry.efficiency)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Top e peggiori categorie per efficienza */}
        {efficiencyData.categoryEfficiency.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 categorie */}
            <div>
              <h5 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                <span className="text-green-400">🏆</span>
                Top 5 Categorie per Efficienza
              </h5>
              <div className="space-y-2">
                {efficiencyData.categoryEfficiency.slice(0, 5).map((cat, index) => (
                  <div key={cat.category} className="bg-slate-900 border border-green-700/30 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-green-900/20 border-green-600 text-green-400">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium text-slate-200">{cat.category}</span>
                        {getTrendIcon(cat.trend)}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: getEfficiencyColor(cat.efficiency) }}>
                          {cat.efficiency.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-400">Score</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs text-slate-400">
                      <div>
                        <span className="text-slate-300">Speso:</span> {obfuscateAmount(cat.spent)}
                      </div>
                      <div>
                        <span className="text-slate-300">Transazioni:</span> {cat.transactionCount}
                      </div>
                      <div>
                        <span className="text-slate-300">Media:</span> {obfuscateAmount(cat.averageTransaction)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Box spiegazione Top 5 */}
              <div className="mt-4 p-3 bg-green-950/30 border border-green-700/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 text-sm">💡</span>
                  <div className="text-xs text-green-300">
                    <div className="font-medium mb-1">Perché sono considerate TOP:</div>
                    <div className="text-green-400/80">
                      Le categorie più efficienti sono quelle con molte transazioni di piccolo importo. 
                      Questo indica spese frequenti ma controllate, tipiche di una gestione finanziaria disciplinata.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Peggiori 5 categorie */}
            <div>
              <h5 className="font-medium text-slate-200 mb-3 flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                Peggiori 5 Categorie per Efficienza
              </h5>
              <div className="space-y-2">
                {efficiencyData.categoryEfficiency.slice(-5).reverse().map((cat, index) => {
                  const actualIndex = efficiencyData.categoryEfficiency.length - 5 + (4 - index);
                  return (
                    <div key={cat.category} className="bg-slate-900 border border-red-700/30 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-red-900/20 border-red-600 text-red-400">
                            #{actualIndex + 1}
                          </Badge>
                          <span className="font-medium text-slate-200">{cat.category}</span>
                          {getTrendIcon(cat.trend)}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold" style={{ color: getEfficiencyColor(cat.efficiency) }}>
                            {cat.efficiency.toFixed(1)}
                          </div>
                          <div className="text-xs text-slate-400">Score</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-slate-400">
                        <div>
                          <span className="text-slate-300">Speso:</span> {obfuscateAmount(cat.spent)}
                        </div>
                        <div>
                          <span className="text-slate-300">Transazioni:</span> {cat.transactionCount}
                        </div>
                        <div>
                          <span className="text-slate-300">Media:</span> {obfuscateAmount(cat.averageTransaction)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Box spiegazione Peggiori 5 */}
              <div className="mt-4 p-3 bg-red-950/30 border border-red-700/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 text-sm">⚠️</span>
                  <div className="text-xs text-red-300">
                    <div className="font-medium mb-1">Perché sono considerate PEGGIORI:</div>
                    <div className="text-red-400/80">
                      Le categorie meno efficienti presentano poche transazioni di importo elevato. 
                      Questo può indicare spese impulsive o mancanza di controllo sui costi in queste aree.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {efficiencyData.categoryEfficiency.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            <span className="text-4xl block mb-2">📊</span>
            <p>Nessun dato disponibile per l'analisi dell'efficienza</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}