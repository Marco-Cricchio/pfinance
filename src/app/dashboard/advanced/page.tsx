'use client';

import { useState, useEffect } from 'react';
import { AdvancedDashboard } from '@/components/AdvancedDashboard';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParsedData } from '@/types/transaction';

export default function AdvancedPage() {
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
          <p className="text-sm text-muted-foreground">Loading advanced dashboard...</p>
        </div>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div className="space-y-6">
        {/* Welcome Alert */}
        <div className="bg-accent border border-accent p-6 flex items-start gap-4">
          <TrendingUp className="h-6 w-6 text-accent-foreground mt-1" />
          <div>
            <h3 className="font-semibold text-accent-foreground mb-2">Advanced Analytics Dashboard</h3>
            <p className="text-accent-foreground text-sm">No data available yet. Please upload financial data from the Overview section to access advanced analytics.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Advanced Charts
              </CardTitle>
              <CardDescription>Deep dive analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Calendar heatmaps
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Weekly spending patterns
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Amount frequency analysis
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-secondary" />
                Trend Analysis
              </CardTitle>
              <CardDescription>Historical patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Balance evolution
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Spending profiles
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Top vendors analysis
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                🔍
                Deep Insights
              </CardTitle>
              <CardDescription>Detailed breakdowns</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="feature-list space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Category distributions
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  Waterfall analysis
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  Budget tracking
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
        <div className="bg-accent border border-accent p-4 flex items-center gap-3 flex-1 mr-4">
          <div className="bg-accent-foreground/10 p-2 rounded">
            <TrendingUp className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-accent-foreground text-sm">Advanced Analytics Active</div>
            <div className="text-accent-foreground text-xs">
              Deep dive analysis of {parsedData.transactions.length} transactions
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Dashboard Component */}
      <AdvancedDashboard data={parsedData} />
    </div>
  );
}