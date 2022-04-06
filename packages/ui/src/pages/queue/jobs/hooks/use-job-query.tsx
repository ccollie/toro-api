import { GetQueueJobsDocument, JobSearchStatus, SortOrderEnum } from '@/types';
import { useLazyQuery } from '@apollo/client';
import produce from 'immer';
import { useCallback, useState } from 'react';
import type {
  JobCounts,
  JobFragment,
} from '@/types';
import { useQueue } from '@/hooks';
import { EmptyJobCounts } from 'src/constants';

interface JobListProps {
  queueId: string;
  status?: JobSearchStatus;
  filter?: string;
  page?: number;
}

export function useJobQuery(props: JobListProps) {
  const { queueId, status } = props;

  const [counts, setCounts] = useState<JobCounts>(EmptyJobCounts);
  const [data, setData] = useState<JobFragment[]>([]);
  const [total, setTotal] = useState(0);

  const {queue, updateQueue}= useQueue(queueId);

  function updateResults(jobs: JobFragment[], counts: JobCounts) {
    setData(jobs);
    setCounts(counts);
    let total = 0;

    if (status) {
      total = parseInt((counts as any)[status], 10);
      if (isNaN(total)) total = 0;
    } else {
      Object.keys(counts).forEach((key) => {
        const v = parseInt((counts as any)[key], 10);
        if (Number.isFinite(v)) total += v;
      });
    }
    setTotal(total);
    if (queue) {
      updateQueue(produce(queue, draft => {
        Object.assign(draft.jobCounts, {
          ...(draft.jobCounts ?? {}),
          ...counts
        });
      }));
    }
  }

  const [getJobs, { loading, called }] = useLazyQuery(GetQueueJobsDocument,{
    fetchPolicy: 'cache-and-network',
  });

  const fetch = useCallback(function fetch(
    page = 1,
    pageSize = 10,
    sortOrder: SortOrderEnum = SortOrderEnum.Desc
  ): Promise<JobFragment[]> {
    const offset = (page - 1) * pageSize;

    return getJobs({
      variables: {
        id: queueId,
        status,
        offset,
        limit: pageSize,
        sortOrder,
      },
    }).then((res) => {
      const { data } = res;
      const counts = data?.queue?.jobCounts || EmptyJobCounts;
      const jobs = data?.queue?.jobs || [];
      updateResults(jobs, counts);
      return jobs;
    });
  }, [status, queueId]);

  return {
    called,
    loading,
    total,
    counts,
    data,
    fetch,
  };
}

export default useJobQuery;
