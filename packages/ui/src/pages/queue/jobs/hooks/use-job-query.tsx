import { GetQueueJobsDocument, SortOrderEnum } from '@/types';
import { useLazyQuery } from '@apollo/client';
import produce from 'immer';
import { useCallback, useState } from 'react';
import type {
  JobCounts,
  MetricFragment,
  Status,
  JobStatus
} from '@/types';
import { EmptyJobCounts } from '@/services/queue';
import { useQueue } from '@/hooks';

interface JobListProps {
  queueId: string;
  status: Status;
}

export function useJobQuery(props: JobListProps) {
  const { queueId, status } = props;

  const [counts, setCounts] = useState<JobCounts>(EmptyJobCounts);
  const [data, setData] = useState<MetricFragment[]>([]);
  const [total, setTotal] = useState(0);

  const {queue, updateQueue}= useQueue(queueId);

  function updateResults(jobs: MetricFragment[], counts: JobCounts) {
    setData(jobs);
    setCounts(counts);
    let total = parseInt((counts as any)[status], 10);
    if (isNaN(total)) total = 0;
    setTotal(total);
    if (queue) {
      updateQueue(queueId, produce(queue, draft => {
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
  ): Promise<MetricFragment[]> {
    const offset = (page - 1) * pageSize;

    const _status = status === 'latest' ? undefined : (status as JobStatus);

    return getJobs({
      variables: {
        id: queueId,
        status: _status,
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
