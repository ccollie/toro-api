import { GetQueueJobsDocument, SortOrderEnum } from '@/types';
import { useLazyQuery } from '@apollo/client';
import produce from 'immer';
import { useCallback, useEffect, useState } from 'react';
import type {
  JobCounts,
  MetricFragment,
  Status,
  JobStatus
} from '@/types';

import { useInterval, useQueue } from '@/hooks';
import { useWhyDidYouUpdate } from '@/hooks';
import { EmptyJobCounts } from '@/constants';

interface JobListProps {
  queueId: string;
  status: Status;
  page?: number;
  pageSize?: number;
  skip?: boolean;
}

export function useJobQuery(props: JobListProps) {
  const { queueId, status, skip = false, pageSize = 10 } = props;

  const [counts, setCounts] = useState<JobCounts>(EmptyJobCounts);
  const [data, setData] = useState<MetricFragment[]>([]);
  const [total, setTotal] = useState(0);
  const [isManuallyRefreshed, setManuallyRefreshed] = useState(false);
  const [page, setPage] = useState(props.page ?? 0);

  const {queue, updateQueue}= useQueue(queueId);

  function updateResults(jobs: MetricFragment[], counts: JobCounts) {
    setData(jobs);
    setCounts(counts);
    let _total = parseInt((counts as any)[status], 10);
    if (isNaN(_total)) _total = 0;
    setTotal(_total);
    setManuallyRefreshed(false);
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
    onCompleted(data) {
      const counts = data.queue?.jobCounts || EmptyJobCounts;
      const jobs = data.queue?.jobs || [];
      updateResults(jobs, counts);
    },
  });

  useWhyDidYouUpdate('useJobQuery', props);

  const fetch = useCallback(function fetch(
    pageNumber?: number,
    pageSz = 10,
    sortOrder: SortOrderEnum = SortOrderEnum.Desc
  ): void {
    if (skip) return;
    const limit = pageSz || pageSize;
    pageNumber = pageNumber || page || 1;
    const offset = (pageNumber - 1) * pageSz;
    setPage(pageNumber);

    const _status = status === 'latest' ? undefined : (status as JobStatus);

    getJobs({
      variables: {
        id: queueId,
        status: _status,
        offset,
        limit,
        sortOrder,
      },
    });
  }, [status, queueId, props.page, props.pageSize]);


  useEffect(fetch, [fetch]);
  useInterval(refresh, 25000, { immediate: false }); // todo: get poll interval config

  function refresh() {
    if (skip) return;
    if (called && !loading && !isManuallyRefreshed) {
      fetch();
    }
    setManuallyRefreshed(false);
  }

  function manualRefresh() {
    setManuallyRefreshed(true);
    fetch();
  }

  return {
    called,
    loading,
    total,
    counts,
    data,
    fetch,
    refresh: manualRefresh,
  };
}

export default useJobQuery;
