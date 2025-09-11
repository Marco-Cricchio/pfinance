'use client';

import { InsightCard } from './InsightCard';

export interface Insight {
  id: string;
  icon: string;
  title: string;
  description: string;
  value?: string;
  trend?: 'up' | 'down' | 'neutral';
  severity?: 'info' | 'warning' | 'success' | 'danger';
}

interface InsightsListProps {
  insights: Insight[];
  title?: string;
  obfuscateAmount?: (amount: number) => string;
}

export function InsightsList({ insights, title = "💡 Insights Automatici", obfuscateAmount }: InsightsListProps) {
  if (!insights.length) {
    return (
      <div className="text-center text-slate-400 py-4">
        <span className="text-2xl">🔍</span>
        <p className="text-sm mt-2">Nessun insight disponibile al momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
        {title}
      </h4>
      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            icon={insight.icon}
            title={insight.title}
            description={insight.description}
            value={insight.value}
            trend={insight.trend}
            severity={insight.severity}
            obfuscateAmount={obfuscateAmount}
          />
        ))}
      </div>
    </div>
  );
}