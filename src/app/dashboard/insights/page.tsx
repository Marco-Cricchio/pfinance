'use client';

import { useState, useEffect } from 'react';
import { AIInsights } from '@/components/AIInsights';
import { Sparkles, Lightbulb } from 'lucide-react';
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
        <div className="bg-destructive border border-destructive p-6 flex items-start gap-4">
          <Lightbulb className="h-6 w-6 text-destructive-foreground mt-1" />
          <div>
            <h3 className="font-semibold text-destructive-foreground mb-2">AI Insights & Recommendations</h3>
            <p className="text-destructive-foreground text-sm">Get personalized financial advice and recommendations. Upload your financial data to unlock AI-powered insights.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-primary" />
                Smart Recommendations
              </CardTitle>
              <CardDescription>Personalized advice</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Budget optimization tips
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Spending reduction advice
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Savings opportunities
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-secondary" />
                AI Analysis
              </CardTitle>
              <CardDescription>Intelligent insights</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Spending patterns
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Financial health score
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Goal recommendations
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                🎯
                Action Items
              </CardTitle>
              <CardDescription>Next steps</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Immediate actions
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Monthly goals
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Long-term strategies
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sample AI Insights Preview
            </CardTitle>
            <CardDescription>Examples of what you'll receive with your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-secondary/10 border border-secondary/20 rounded">
                <div className="flex items-start gap-3">
                  <div className="bg-secondary text-secondary-foreground w-8 h-8 flex items-center justify-center text-sm font-semibold rounded">💡</div>
                  <div>
                    <div className="font-medium text-sm mb-1">Optimize Your Coffee Budget</div>
                    <div className="text-muted-foreground text-xs">You spend €127/month on coffee. Consider a monthly subscription to save ~€35.</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-accent/10 border border-accent/20 rounded">
                <div className="flex items-start gap-3">
                  <div className="bg-accent text-accent-foreground w-8 h-8 flex items-center justify-center text-sm font-semibold rounded">📈</div>
                  <div>
                    <div className="font-medium text-sm mb-1">Weekend Spending Alert</div>
                    <div className="text-muted-foreground text-xs">Your weekend spending is 40% higher than weekdays. Consider setting a weekend budget.</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center text-sm font-semibold rounded">🎯</div>
                  <div>
                    <div className="font-medium text-sm mb-1">Savings Opportunity</div>
                    <div className="text-muted-foreground text-xs">Based on your income, you could comfortably save €200 more per month.</div>
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
        <div className="bg-destructive border border-destructive p-4 flex items-center gap-3 flex-1 mr-4">
          <div className="bg-destructive-foreground/10 p-2 rounded">
            <Lightbulb className="h-4 w-4 text-destructive-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-destructive-foreground text-sm">AI Insights Generated</div>
            <div className="text-destructive-foreground text-xs">
              Personalized recommendations from {parsedData.transactions.length} transactions
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Component */}
      <AIInsights data={parsedData} />
    </div>
  );
}