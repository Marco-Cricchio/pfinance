'use client';

import { useState, useEffect } from 'react';
import { IntelligentAnalysis } from '@/components/IntelligentAnalysis';
import { Brain, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParsedData } from '@/types/transaction';

export default function IntelligentPage() {
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
          <p className="text-sm text-muted-foreground">Loading intelligent analysis...</p>
        </div>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div className="space-y-6">
        {/* Welcome Alert */}
        <div className="bg-primary border border-primary p-6 flex items-start gap-4">
          <Brain className="h-6 w-6 text-primary-foreground mt-1" />
          <div>
            <h3 className="font-semibold text-primary-foreground mb-2">Intelligent Analysis Dashboard</h3>
            <p className="text-primary-foreground text-sm">AI-powered insights and analysis. Upload financial data first to unlock intelligent patterns and predictions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI-Powered Features
              </CardTitle>
              <CardDescription>What intelligent analysis offers</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-3">
                <li className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">🧠</div>
                  <div>
                    <div className="font-medium text-sm">Seasonal Trends</div>
                    <div className="text-muted-foreground text-xs">Discover seasonal spending patterns</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-secondary text-secondary-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">📊</div>
                  <div>
                    <div className="font-medium text-sm">Pareto Analysis</div>
                    <div className="text-muted-foreground text-xs">80/20 rule in your spending</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-accent text-accent-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">⚡</div>
                  <div>
                    <div className="font-medium text-sm">Anomaly Detection</div>
                    <div className="text-muted-foreground text-xs">Identify unusual transactions</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-destructive text-destructive-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">🔮</div>
                  <div>
                    <div className="font-medium text-sm">Budget Forecasting</div>
                    <div className="text-muted-foreground text-xs">Predict future spending</div>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Smart Insights
              </CardTitle>
              <CardDescription>Advanced pattern recognition</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-3">
                <li className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">📈</div>
                  <div>
                    <div className="font-medium text-sm">Weekly Patterns</div>
                    <div className="text-muted-foreground text-xs">Day-of-week spending habits</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-secondary text-secondary-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">💡</div>
                  <div>
                    <div className="font-medium text-sm">Efficiency Analysis</div>
                    <div className="text-muted-foreground text-xs">Optimize your spending</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-accent text-accent-foreground w-6 h-6 flex items-center justify-center text-xs font-semibold">🌊</div>
                  <div>
                    <div className="font-medium text-sm">Cash Flow Analysis</div>
                    <div className="text-muted-foreground text-xs">Money in vs money out patterns</div>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="bg-primary border border-primary p-4 flex items-center gap-3 flex-1 mr-4">
          <div className="bg-primary-foreground/10 p-2 rounded">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-primary-foreground text-sm">Intelligent Analysis Active</div>
            <div className="text-primary-foreground text-xs">
              AI-powered insights from {parsedData.transactions.length} transactions
            </div>
          </div>
        </div>
      </div>

      {/* Intelligent Analysis Component */}
      <IntelligentAnalysis data={parsedData} />
    </div>
  );
}