// utility hooks for updating the results of a job query.
// used to share code between other hooks

import produce from 'immer';
import { useCallback } from 'react';
import { useQueue } from 'src/hooks';
import { calcJobCountTotal } from 'src/services';
import { useJobsStore } from 'src/stores';
import { JobCounts, JobFragment, JobSearchStatus, Queue } from 'src/types';

export function useUpdateResults(queue: Queue, pageSize: number) {
  const setJobs = useJobsStore((state) => state.setJobs);
  const { updateQueue } = useQueue(queue.id);

  const updateResults = useCallback(
    (status: JobSearchStatus | undefined, jobs: JobFragment[], counts?: JobCounts) => {
      setJobs(jobs);
      let total = 0;
      let pages = 0;
      if (counts) {
        total = calcJobCountTotal(counts, status);
        pages = total === 0 ? 0 : Math.floor(total / pageSize);
        updateQueue(
          produce(queue, (draft) => {
            Object.assign(draft.jobCounts, {
              ...(draft.jobCounts ?? {}),
              ...counts,
            });
          }),
        );
      }
      return { total, pages };
    },
    [queue],
  );

  return {
    updateResults,
  };
}
