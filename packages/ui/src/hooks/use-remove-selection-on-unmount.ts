import { useRef } from 'react';
import { useUnmountEffect } from 'src/hooks';

export const useRemoveSelectionOnUnmount = (
  id: string,
  isSelected: boolean,
  removeSelected: (id: string) => void
) => {
  const savedRef = useRef<{ id: string; isSelected: boolean }>({
    id,
    isSelected,
  });
  useUnmountEffect(() => {
    const { id, isSelected } = savedRef.current;
    if (isSelected && id) {
      removeSelected(id);
    }
  }, []);
};
