import { useRef } from 'react';
import { useUnmountEffect } from 'src/hooks';

export const useRemoveJobSelectionOnUnmount = (
  jobId: string,
  isSelected: boolean,
  removeSelected: (id: string) => void
) => {
  const savedRef = useRef<{ jobId: string; isSelected: boolean }>({
    jobId,
    isSelected,
  });
  useUnmountEffect(() => {
    const { jobId, isSelected } = savedRef.current;
    if (isSelected && jobId) {
      removeSelected(jobId);
    }
  }, []);
};

export * from './use-job-query-parameters';
