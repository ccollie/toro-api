// utility hooks for updating the results of a job query.
// used to share code between other hooks
import { useCallback } from 'react';
import { EmptyJobCounts } from 'src/constants';
import { calcJobCountTotal } from 'src/services';
import { useJobsStore, useStore } from 'src/stores';
import { JobCounts, JobFragment, JobSearchStatus, Queue } from 'src/types';

export function useUpdateResults(queue: Queue, pageSize: number) {
  const setJobs = useJobsStore((state) => state.setJobs);
  const queueUpdate = useStore(state => state.updateQueue);

  const updateResults = useCallback(
    (status: JobSearchStatus | undefined, jobs: JobFragment[], counts?: JobCounts) => {
      setJobs(jobs);
      let total = 0;
      let pages = 0;
      if (counts) {
        total = calcJobCountTotal(counts, status);
        pages = total === 0 ? 0 : Math.floor(total / pageSize);
        const jobCounts = {
          ...(queue.jobCounts ?? EmptyJobCounts),
          ...counts,
        };
        queueUpdate(queue.id, { jobCounts });
      }
      return { total, pages };
    },
    [queue],
  );

  return {
    updateResults,
  };
}
