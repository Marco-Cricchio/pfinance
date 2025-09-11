'use client';

interface InsightCardProps {
  icon: string;
  title: string;
  description: string;
  value?: string;
  trend?: 'up' | 'down' | 'neutral';
  severity?: 'info' | 'warning' | 'success' | 'danger';
  obfuscateAmount?: (amount: number) => string;
}

export function InsightCard({ 
  icon, 
  title, 
  description, 
  value, 
  trend, 
  severity = 'info',
  obfuscateAmount
}: InsightCardProps) {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'success':
        return 'border-green-600 bg-green-900/20 text-green-100';
      case 'warning':
        return 'border-yellow-600 bg-yellow-900/20 text-yellow-100';
      case 'danger':
        return 'border-red-600 bg-red-900/20 text-red-100';
      default:
        return 'border-blue-600 bg-blue-900/20 text-blue-100';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      default:
        return '📊';
    }
  };

  // Function to obfuscate monetary values in text
  const obfuscateText = (text: string): string => {
    if (!obfuscateAmount) return text;
    
    // Replace patterns like "€1.234,56", "€1234", "€1.234", etc.
    return text.replace(/€([\d.,]+)/g, (match, amountStr) => {
      // Parse the amount string and use the obfuscateAmount function
      const cleanAmount = amountStr.replace(/\./g, '').replace(',', '.');
      const numericAmount = parseFloat(cleanAmount);
      if (!isNaN(numericAmount)) {
        return obfuscateAmount(numericAmount);
      }
      return match; // Return original if parsing fails
    });
  };

  return (
    <div className={`p-4 rounded-lg border-l-4 ${getSeverityStyles()}`}>
      <div className="flex items-start space-x-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{title}</h4>
            {trend && (
              <span className="text-lg">{getTrendIcon()}</span>
            )}
          </div>
          <p className="text-sm mt-1 opacity-90">{obfuscateText(description)}</p>
          {value && (
            <div className="mt-2">
              <span className="text-lg font-bold">{obfuscateText(value)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}