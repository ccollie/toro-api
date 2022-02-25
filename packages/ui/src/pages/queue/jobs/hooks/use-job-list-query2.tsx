import { getJobsByFilter, getJobs } from '@/services/queue/api';
import type { MetricFragment, JobCounts, Status } from '@/types';
import { JobStatus, SortOrderEnum } from '@/types';
import { useListState } from '@mantine/hooks';
import produce from 'immer';
import { useCallback, useState } from 'react';
import { useJobsStore, usePreferencesStore } from '@/stores';
import { useQueue, useWhyDidYouUpdate } from '@/hooks';
import { EmptyJobCounts } from 'src/constants';
import shallow from 'zustand/shallow';

interface UseFilteredJobQueryProps {
  queueId: string;
  status: Status | 'unknown';
  filter?: string;
  pageSize?: number;
}

export const useJobListQuery = ({
                                  queueId,
                                  status,
                                  filter,
                                  pageSize: _pageSize,
                                }: UseFilteredJobQueryProps) => {
  const pageSize = _pageSize ?? usePreferencesStore((state) => state.pageSize);

  const [jobs, setJobs] = useJobsStore(state =>
      [
        state.data,
        state.setJobs
      ],
    shallow);

  useWhyDidYouUpdate('useJobListQuery', {
    queueId,
    status,
    filter,
    pageSize,
  });

  const [counts, setCounts] = useState<JobCounts>(EmptyJobCounts);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [lastPage, setLastPage] = useState(0);
  const [called, setCalled] = useState(false);
  const [iterationEnded, setIterationEnded] = useState(false);
  const {queue, updateQueue} = useQueue(queueId);

  const [filteredPages, filteredPageHandlers] = useListState<MetricFragment[]>([]);

  function updateResults(jobs: MetricFragment[], counts: JobCounts) {
    setJobs(jobs);
    setCounts(counts);
    let total = parseInt((counts as any)[status], 10);
    if (isNaN(total)) total = 0;
    setTotal(total);
    const pages = total === 0 ? 0 : Math.floor(total / pageSize);
    setPageCount(pages);
    updateQueue(produce(queue, draft => {
      Object.assign(draft.jobCounts, {
        ...(draft.jobCounts ?? {}),
        ...counts
      });
    }));
  }

  const fetch = useCallback(async function fetch(
    page = 1,
    sortOrder: SortOrderEnum = SortOrderEnum.Desc
  ) {
    page = Math.min(page, 1);
    const offset = (page - 1) * pageSize;

    // todo: support "latest
    // const _status = status === 'latest' ? undefined : (status as JobStatus);
    // todo: eliminate this hack
    const _status = (status as JobStatus);

    setLoading(true);
    try {
      const {jobs, counts} = await getJobs(queueId, _status, offset, pageSize, sortOrder);
      updateResults(jobs, counts);
    } finally {
      setLoading(false);
      setCalled(true);
    }
  }, [queueId, status, pageSize]);


  const fetchFiltered = useCallback(async function(page: number) {
    setLoading(true);
    if (!cursor) {
      setLastPage(0);
      setIterationEnded(false);
      filteredPageHandlers.setState([]);
    }

    const storedPages = filteredPages;
    const storedLength = storedPages.length;

    if (page < 1 || (page > storedPages.length && iterationEnded)) {
      return [];
    }

    if (page <= storedLength) {
      return filteredPages[page - 1];
    }

    try {
      const { jobs, cursor: newCursor, total, counts } = await getJobsByFilter(queueId, {
        status: status as JobStatus,
        count: pageSize,
        cursor,
        criteria: cursor ? undefined : filter,
      });

      updateResults(jobs, counts);
      filteredPageHandlers.append(jobs);
      setTotal(total);
      if (newCursor) {
        const last = lastPage + 1;
        setLastPage(last);
        // for ui purposes, set the last page just beyond the current page
        setPageCount(last + 1);
        filteredPageHandlers.append(jobs);
      } else {
        // we've exhausted all results
        setPageCount(lastPage);
        setCursor(undefined);
        setIterationEnded(true);
      }
    } finally {
      setLoading(false);
      setCalled(true);
    }
  }, [queueId, status]);

  function clear() {
    setCalled(false);
    setCursor(undefined);
    setLastPage(0);
    setIterationEnded(false);
    setPageCount(0);
    setTotal(0);
    setJobs([]);
    filteredPageHandlers.setState([]);
  }

  const fetchJobs = useCallback(async (page: number) => {
    if (filter) {
      await fetchFiltered(page);
    } else {
      await fetch(page);
    }
  }, [queueId, status]);

  const refresh = useCallback(async function refresh() {
    clear();
    await fetch(1);
  }, [queueId, status]);

  return {
    counts,
    pageCount,
    loading,
    called,
    total,  // total jobs in the given status
    jobs,
    clear,
    refresh,
    fetchJobs
  };
};
