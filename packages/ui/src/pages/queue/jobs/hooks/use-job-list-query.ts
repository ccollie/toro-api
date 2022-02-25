import { getJobsByFilter } from '@/services/queue/api';
import type { MetricFragment, JobCounts, GetJobsQuery } from '@/types';
import { JobStatus, useGetJobsByIdQuery, useGetJobsQuery } from '@/types';
import { useListState } from '@mantine/hooks';
import produce from 'immer';
import { useCallback, useEffect, useState } from 'react';
import { useJobsStore } from '@/stores';
import { usePagination, useQueue, useWhyDidYouUpdate } from '@/hooks';
import { EmptyJobCounts } from 'src/constants';
import { useJobQueryParameters } from './use-job-query-parameters';
import { useNetworkSettingsStore } from 'src/stores/network-settings';
import shallow from 'zustand/shallow';

interface UseFilteredJobQueryProps {
  queueId: string;
}

export const useJobListQuery = ({ queueId }: UseFilteredJobQueryProps) => {
  const [counts, setCounts] = useState<JobCounts>(EmptyJobCounts);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [lastPage, setLastPage] = useState(0);
  const [offset, setOffset] = useState(0);
  const [called, setCalled] = useState(false);
  const [iterationEnded, setIterationEnded] = useState(false);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  const { queue, updateQueue } = useQueue(queueId);

  const [filteredPages, filteredPageHandlers] = useListState<MetricFragment[]>([]);
  const [shouldFetchData, textSearchPollingDisabled, pollingInterval] =
    useNetworkSettingsStore(
      (state) => [
        state.shouldFetchData,
        state.textSearchPollingDisabled,
        state.pollingInterval,
      ],
      shallow,
    );

  const {
    status,
    page,
    pageSize,
    jobFilter: filter,
    sortOrder,
  } = useJobQueryParameters();

  const { gotoPage } = usePagination();

  const [jobs, setJobs] = useJobsStore(
    (state) => [state.data, state.setJobs],
    shallow,
  );

  useWhyDidYouUpdate('useJobListQuery', {
    queueId,
    status,
    filter,
    pageSize,
  });

  useEffect(() => {
    const offset = (page - 1) * pageSize;
    setOffset(offset);
  }, [page, pageSize]);

  useEffect(() => {
    if (filter) {
      const ids = jobs.map((job) => job.id);
      setFilteredIds(ids);
    } else {
      setFilteredIds([]);
    }
  }, [jobs, filter]);

  function updateCounts(counts?: JobCounts) {
    if (counts) {
      setCounts(counts);
      let total = parseInt((counts as any)[status], 10);
      if (isNaN(total)) total = 0;
      setTotal(total);
      const pages = total === 0 ? 0 : Math.floor(total / pageSize);
      setPageCount(pages);
      updateQueue(
        produce(queue, (draft) => {
          Object.assign(draft.jobCounts, {
            ...(draft.jobCounts ?? {}),
            ...counts,
          });
        }),
      );
    }
  }

  function updateResults(jobs: MetricFragment[], counts: JobCounts) {
    setJobs(jobs);
    updateCounts(counts);
  }

  const { loading: _jobsLoading } = useGetJobsQuery({
    variables: {
      id: queueId,
      status: status as JobStatus,
      offset,
      limit: pageCount,
      sortOrder,
    },
    pollInterval: pollingInterval,
    skip: !shouldFetchData || !!filter?.length,
    onCompleted: (data: GetJobsQuery) => {
      const jobs = data.getJobs as MetricFragment[];
      setCalled(true);
      setJobs(jobs);
    },
  });

  const { loading: _jobsByIdLoading } = useGetJobsByIdQuery({
    variables: {
      queueId,
      ids: filteredIds,
    },
    pollInterval: pollingInterval,
    skip:
      !shouldFetchData ||
      filteredIds.length === 0 ||
      filter?.length === 0 ||
      textSearchPollingDisabled,
    onCompleted: (data) => {
      const jobs = data.getJobsById as MetricFragment[];
      setJobs(jobs);
      setCalled(true);
    },
  });

  useEffect(() => {
    setLoading(_jobsLoading || _jobsByIdLoading);
  }, [_jobsLoading, _jobsByIdLoading]);

  async function fetchFiltered() {
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

    setLoading(true);
    try {
      const {
        jobs,
        cursor: newCursor,
        total,
        counts,
      } = await getJobsByFilter(queueId, {
        status: status as JobStatus,
        count: pageSize,
        cursor,
        criteria: cursor ? undefined : filter,
      });

      updateResults(jobs, counts);
      filteredPageHandlers.append(jobs);
      setTotal(total);
      if (newCursor) {
        setCursor(newCursor);
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
  }

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

  useEffect(() => {
    if (filter) {
      fetchFiltered().catch(e => console.error(e));
    }
  }, [queueId, status, page, filter]);

  const refresh = useCallback(() => {
    clear();
    gotoPage(1);
  }, []);

  return {
    counts,
    pageCount,
    loading,
    called,
    total, // total jobs in the given status
    jobs,
    clear,
    refresh,
  };
};
