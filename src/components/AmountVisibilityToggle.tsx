'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAmountVisibility } from '@/contexts/AmountVisibilityContext';

export function AmountVisibilityToggle() {
  const { isVisible, isLoading, toggleVisibility } = useAmountVisibility();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleVisibility}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
      ) : isVisible ? (
        <EyeOff className="h-3 w-3" />
      ) : (
        <Eye className="h-3 w-3" />
      )}
      {isVisible ? 'Nascondi importi' : 'Mostra importi'}
    </Button>
  );
}