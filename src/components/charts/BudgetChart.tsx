'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

interface BudgetAnalysis {
  currentMonth: number;
  averageBudget: number;
  percentage: number;
  difference: number;
  isOverBudget: boolean;
}

interface BudgetChartProps {
  budgetAnalysis: BudgetAnalysis | null;
}

export function BudgetChart({ budgetAnalysis }: BudgetChartProps) {
  const { isVisible, obfuscateAmount } = useAmountVisibility();
  if (!budgetAnalysis) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Mensile Corrente</CardTitle>
        <CardDescription>
          Confronto tra spesa corrente e media degli ultimi 6 mesi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {budgetAnalysis.percentage.toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">
              del budget medio utilizzato
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Spesa Corrente:</span>
              <span className="font-medium">
                {isVisible 
                  ? `€${budgetAnalysis.currentMonth.toLocaleString('it-IT')}` 
                  : '€●●●.●●'
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Budget Medio:</span>
              <span className="font-medium">
                {isVisible 
                  ? `€${budgetAnalysis.averageBudget.toLocaleString('it-IT')}` 
                  : '€●●●.●●'
                }
              </span>
            </div>
            <div className={`flex justify-between text-sm font-medium ${
              budgetAnalysis.isOverBudget ? 'text-red-600' : 'text-green-600'
            }`}>
              <span>Differenza:</span>
              <span>
                {budgetAnalysis.isOverBudget ? '+' : ''}
                {isVisible 
                  ? `€${budgetAnalysis.difference.toLocaleString('it-IT')}` 
                  : '€●●●.●●'
                }
              </span>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${
                budgetAnalysis.isOverBudget ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min(budgetAnalysis.percentage, 100)}%`
              }}
            />
          </div>
          
          {budgetAnalysis.isOverBudget && (
            <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded">
              ⚠️ Hai superato il budget medio del {(budgetAnalysis.percentage - 100).toFixed(0)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}