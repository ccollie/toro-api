import {
  GetJobsByFilterQuery,
  JobCounts,
  useGetJobsByFilterLazyQuery,
  useGetJobsByIdQuery,
} from '@/types';
import { useEffect, useState } from 'react';
import type { JobFragment, JobState } from '@/types';
import { useQueue, useToast } from '@/hooks';
import { useJobsStore } from '@/stores';
import shallow from 'zustand/shallow';
import { useUpdateResults } from './use-update-results';

interface UseFilteredJobQueryProps {
  queueId: string;
  status: JobState;
  filter?: string;
  page: number;
  pageSize: number;
  pollInterval?: number;
  shouldFetch: boolean;
}

export const useFilteredJobQuery = (props: UseFilteredJobQueryProps) => {
  const toast = useToast();
  const {
    queueId,
    status,
    filter: _filter,
    page,
    pageSize = 10,
    pollInterval,
    shouldFetch,
  } = props;

  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(Math.min(page, 1));
  const [totalPages, setTotalPages] = useState(Math.min(page, 1));
  const [pageCount, setPageCount] = useState(0);
  const [iterationEnded, setIterationEnded] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);

  const [cursor, setCursor] = useState<string>();
  const [filter] = useState<string>((_filter ?? '').trim());
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [polling, setPolling] = useState<boolean>(false);

  const [jobs, setJobs] = useJobsStore(
    (state) => [state.data, state.setJobs],
    shallow,
  );

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

  const [fetchJobs, { loading, called, refetch: _refetch }] =
    useGetJobsByFilterLazyQuery({
      variables: {
        queueId,
        status,
        cursor,
        count: pageSize,
        criteria: cursor ? undefined : filter,
      },
      fetchPolicy: 'network-only',
      pollInterval: filter ? pollInterval : undefined,
      notifyOnNetworkStatusChange: true,
      onCompleted,
      onError: (err) => {
        const msg = err.message ?? `${err}`;
        toast.error(msg);
      },
    });

  function onCompleted(data: GetJobsByFilterQuery) {
    if (data.queue?.jobSearch) {
      const { total, jobs, cursor: newCursor } = data.queue.jobSearch;
      if (newCursor !== cursor) {
        clearPagination();
      }

      setJobIds(jobs.map((job) => job.id));
      const counts = data.queue.jobCounts;
      updateResults(status, jobs, counts);
      recalcPagination(total);
      setCursor(newCursor ?? undefined);
      storePageInSession(page);
      if (newCursor) {
        const last = lastPage + 1;
        setLastPage(last);
        // for ui purposes, set the last page just beyond the current page
        setPageCount(last + 1);
        // filteredPageHandlers.append(jobs);
      } else {
        // we've exhausted all results
        setPageCount(lastPage);
        setCursor(undefined);
        setIterationEnded(true);
      }
    }
  }

  useGetJobsByIdQuery({
    variables: {
      queueId,
      ids: jobIds,
    },
    displayName: 'useFilteredJobQuery:getJobsById',
    skip: (!called || !polling || !jobIds.length) || !shouldFetch,
    pollInterval,
    onCompleted: (data) => {
      if (data.getJobsById) {
        const jobs = (data.getJobsById ?? []) as JobFragment[];
        setJobs(jobs);
      }
    },
  });

  function refetch() {
    return _refetch({
      queueId,
      status,
      cursor,
      count: pageSize,
      criteria: cursor ? undefined : filter,
    }).then((res) => {
      onCompleted(res.data);
      return jobs;
    });
  }

  useEffect(() => {
    if (cursor) {
      setHasNext(true);
      setIterationEnded(false);
    } else if (!filter) {
      setHasNext(false);
    } else {
      setHasNext(page < totalPages);
    }
  }, [cursor, page, totalPages]);

  useEffect(() => {
    if (!filter) {
      setPolling(false);
    }
    setCursor(undefined);
    clearPagination();
    if (filter) {
      fetchJobs().catch((err) => {
        const msg = err.message ?? `${err}`;
        toast.error(msg);
      });
    } else {
      setJobs([]);
    }
  }, [filter, status, pageSize]);

  function getSessionKey(suffix: string): string {
    const rest = cursor ? [cursor] : [];
    rest.push(suffix);
    return `filtered-jobs-${queueId}:${status}:${rest.join(':')}`;
  }

  function clearPagination() {
    setTotalPages(0);
    setLastPage(0);
    setTotal(0);
  }

  function recalcPagination(total: number) {
    setTotal(total);
    const pages = total === 0 ? 0 : Math.floor(total / pageSize);
    setTotalPages(pages);
  }

  function clear() {
    setCursor(undefined);
    setIterationEnded(false);
    clearPagination();
    setJobs([]);
    setPolling(false);
  }

  function refresh() {
    if (called && !loading) {
      clear();
      refetch();
    }
  }

  async function fetch(): Promise<JobFragment[]> {
    return refetch();
  }

  function storePageInSession(index: number): void {
    if (index > 0) {
      const key = getSessionKey(`page:${index}`);
      if (jobs && jobs.length) {
        try {
          const items = JSON.stringify(jobs);
          sessionStorage.setItem(key, items);
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  function getPageFromSession(index: number): void {
    if (index > 0) {
      const key = getSessionKey(`page:${index}`);
      const data = sessionStorage.getItem(key);
      if (data && data.length) {
        try {
          const items = JSON.parse(data);
          if (Array.isArray(items)) {
            setJobs(items as JobFragment[]);
            return;
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
    setJobs([]);
  }

  async function getPage(index: number): Promise<JobFragment[]> {
    if (index < 0 || index > totalPages) {
      return [];
    }
    if (index === page) {
      return jobs;
    }
    if (index < page && index > 0) {
      getPageFromSession(index);
      return jobs;
    }
    if (index === page + 1) {
      return fetch();
    }
    return [];
  }

  return {
    clear,
    getPage,
    hasNext,
    refresh,
    fetch,
    total,
    jobs,
    loading,
    called,
    pageCount,
  };
};

export default useFilteredJobQuery;
