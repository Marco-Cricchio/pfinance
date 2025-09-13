'use client';

// Demo component to visualize the color scale - for testing purposes
export function ColorScaleDemo() {
  const getColorIntensity = (expenses: number, maxExpenses: number) => {
    if (expenses === 0 || maxExpenses === 0) {
      return {
        backgroundColor: '#374151',
        color: '#9CA3AF'
      };
    }
    
    const intensity = Math.min(expenses / maxExpenses, 1);
    
    // Three discrete color levels: Green, Yellow, Red
    if (intensity <= 0.33) {
      // Low expenses: Green
      return {
        backgroundColor: 'hsl(120, 60%, 45%)', // Green
        color: '#fff'
      };
    } else if (intensity <= 0.66) {
      // Medium expenses: Yellow  
      return {
        backgroundColor: 'hsl(60, 80%, 50%)', // Yellow
        color: '#000'
      };
    } else {
      // High expenses: Red
      return {
        backgroundColor: 'hsl(0, 75%, 45%)', // Red
        color: '#fff'
      };
    }
  };

  const maxExpenses = 100;
  const steps = Array.from({length: 21}, (_, i) => i * 5); // 0, 5, 10, ..., 100

  return (
    <div className="p-6 bg-slate-900 rounded-lg">
      <h3 className="text-white text-lg font-semibold mb-4">Scala Colori Coerente - Demo</h3>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {steps.map((value) => {
          const style = getColorIntensity(value, maxExpenses);
          const intensity = value / maxExpenses;
          return (
            <div
              key={value}
              className="h-12 w-12 rounded flex items-center justify-center text-xs font-bold border border-slate-600"
              style={style}
              title={`${value}% intensity`}
            >
              {Math.round(intensity * 100)}%
            </div>
          );
        })}
      </div>
      <div className="text-slate-400 text-sm">
        <p>• 🟢 Verde (0-33%): Spese basse</p>
        <p>• 🟡 Giallo (34-66%): Spese medie</p>
        <p>• 🔴 Rosso (67-100%): Spese elevate</p>
        <p className="text-xs mt-2 text-slate-500">Scala semplificata con solo 3 colori discreti</p>
      </div>
    </div>
  );
}