import { useCallback, useEffect } from 'react';

export type EscPressedCallback = () => void;

export function useEscPressed(callback: EscPressedCallback) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' || event.keyCode === 27) {
      callback();
    }
  }, [callback]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
