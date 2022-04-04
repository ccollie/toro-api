import type {
  JobFragment,
  JobCounts,
  JobState,
  GetQueueJobsQuery
} from '@/types';
import { SortOrderEnum, useGetQueueJobsQuery } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { useJobsStore } from '@/stores';
import { useQueue, useUpdateEffect } from '@/hooks';
import { useUpdateResults } from './use-update-results';
import shallow from 'zustand/shallow';

interface UnfilteredJobQueryProps {
  queueId: string;
  status: JobState;
  page: number;
  pageSize: number;
  pollInterval?: number;
  shouldFetch: boolean;
}

export const useUnfilteredJobListQuery = ({
  queueId,
  status,
  page,
  pageSize,
  pollInterval,
  shouldFetch
}: UnfilteredJobQueryProps) => {

  const [jobs, setJobs] = useJobsStore(
    (state) => [state.data, state.setJobs],
    shallow,
  );

  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [offset, setOffset] = useState(0);

  const { queue } = useQueue(queueId);
  const { updateResults: updateFn } = useUpdateResults(queue, pageSize);

  function updateResults(
    status: JobState,
    jobs: JobFragment[],
    counts: JobCounts,
  ) {
    const { total: _total, pages: _pages } = updateFn(status, jobs, counts);
    setTotal(_total);
    setPageCount(_pages);
  }

  useEffect(() => {
    const pg = Math.min(page, 1);
    setOffset((pg - 1) * pageSize);
  }, [page, pageSize]);

  const { loading, called, refetch } = useGetQueueJobsQuery({
    variables: {
      queueId,
      offset,
      limit: pageSize,
      status,
    },
    skip: !shouldFetch,
    notifyOnNetworkStatusChange: true,
    pollInterval,
    onCompleted: (data) => {
      // console.log('completed', data);
      handleCompleted(status, data);
    },
  });

  function handleCompleted(status: JobState, data: GetQueueJobsQuery) {
    const base = data.queue;
    const jobs = (base?.jobs || []) as JobFragment[];
    const { __typename, ...counts } = base?.jobCounts as JobCounts;
    updateResults(status, jobs, counts);
  }

  async function fetch(
    sortOrder: SortOrderEnum = SortOrderEnum.Desc,
  ): Promise<Array<JobFragment>> {
    // todo: support "latest
    // const _status = status === 'latest' ? undefined : (status as JobStatus);
    // todo: eliminate this hack
    const _status = status as JobState;
    const _page = Math.min(page, 1);
    const offset = (_page - 1) * pageSize;

    return refetch({
      queueId,
      offset,
      limit: pageSize,
      status: _status,
      sortOrder,
    }).then(({ data }) => {
      const base = data.queue;
      const jobs = (base?.jobs || []) as JobFragment[];
      handleCompleted(_status, data);
      return jobs;
    });
  }

  useUpdateEffect(() => {
    fetch().catch(e => console.error(e));
  }, [queueId, offset]);

  function clear() {
    setPageCount(0);
    setTotal(0);
    setJobs([]);
  }

  const refresh = useCallback(async function refresh() {
    clear();
    return refetch();
  }, []);

  return {
    pageCount,
    loading,
    called,
    total, // total jobs in the given status
    jobs,
    clear,
    refresh,
    fetch,
  };
};
