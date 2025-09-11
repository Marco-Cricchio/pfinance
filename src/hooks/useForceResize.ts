import { useEffect } from 'react';

export function useForceResize(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // Forza il resize di tutti i grafici Recharts dopo che il modal si apre
      const forceResize = () => {
        window.dispatchEvent(new Event('resize'));
        // Forza anche il requestAnimationFrame per assicurare il re-render
        window.requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      };
      
      // Multiple timeouts per assicurare che i grafici si renderizzino correttamente
      const timeouts = [
        setTimeout(forceResize, 10),
        setTimeout(forceResize, 50),
        setTimeout(forceResize, 150),
        setTimeout(forceResize, 300),
        setTimeout(forceResize, 500)
      ];
      
      // Immediate resize
      forceResize();
      
      return () => {
        timeouts.forEach(clearTimeout);
      };
    }
  }, [isOpen]);
}