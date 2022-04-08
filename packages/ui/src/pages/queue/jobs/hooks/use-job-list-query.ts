import { useEffect, useState } from 'react';
import { useJobsStore, useRefetchJobsLockStore } from '@/stores';
import { usePagination, useWhyDidYouUpdate } from '@/hooks';
import { JobSearchStatus } from 'src/types';
import { useUnfilteredJobListQuery } from './use-unfiltered-job-list-query';
import useFilteredJobQuery from './use-filtered-job-query';
import { useNetworkSettingsStore } from '@/stores/network-settings';
import shallow from 'zustand/shallow';

type TProps = {
  queueId: string;
  status: JobSearchStatus;
  page: number;
  filter?: string;
};

export const useJobListQuery = (props: TProps) => {
  const {
    queueId,
    status,
    page,
    filter
  } = props;

  const { pageSize } = usePagination();
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [called, setCalled] = useState(false);

  const isFetchLocked = useRefetchJobsLockStore((state) => state.isLocked);
  const [shouldFetchData, refetchInterval] =
    useNetworkSettingsStore(
      (state) => [
        state.shouldFetchData ?? true, // BAD !!!
        state.textSearchPollingDisabled,
        state.pollingInterval,
      ],
      shallow,
    );

  const jobs = useJobsStore((state) => state.data);

  const shouldFetch = shouldFetchData && !isFetchLocked; // && !textSearchPollingDisabled;
  const pollInterval = shouldFetch ? (refetchInterval ?? 5000) : undefined;

  useWhyDidYouUpdate('useJobListQuery', {
    queueId,
    status,
    page,
    filter,
    pageSize,
  });

  let interval: number | undefined;

  if (typeof pollInterval === 'number') {
    interval = pollInterval;
  } else if (pollInterval === false) {
    interval = undefined;
  }

  const {
    fetch: filteredFetch,
    loading: filteredLoading,
    refresh: filteredRefresh,
    called: filteredCalled,
    clear: filteredClear,
    total: filteredTotal,
    pageCount: filteredPageCount,
  } = useFilteredJobQuery({
    queueId,
    pollInterval: interval,
    status,
    filter,
    page,
    pageSize,
    shouldFetch,
  });

  const {
    fetch: basicFetch,
    loading: basicLoading,
    refresh: basicRefresh,
    called: basicCalled,
    clear: basicClear,
    total: basicTotal,
    pageCount: basicPageCount,
  } = useUnfilteredJobListQuery({
    queueId,
    status,
    page,
    pageSize,
    pollInterval: interval,
    shouldFetch: shouldFetch && !filter,
  });

  useEffect(() => {
    setCalled(filter ? filteredCalled : basicCalled);
  }, [filteredCalled, basicCalled]);

  useEffect(() => {
    setLoading(filter ? filteredLoading : basicLoading);
  }, [filteredLoading, basicLoading]);

  useEffect(() => {
    setTotal(filter ? filteredTotal : basicTotal);
  }, [filteredTotal, basicTotal]);

  useEffect(() => {
    setPageCount(filter ? filteredPageCount : basicPageCount);
  }, [filteredPageCount, basicPageCount]);

  async function fetch() {
    if (filter) {
      return filteredFetch();
    }
    return basicFetch();
  }

  function clear() {
    if (filter) {
      filteredClear();
    } else {
      basicClear();
    }
  }

  function refresh() {
    if (filter) {
      filteredRefresh();
    } else {
      basicRefresh();
    }
  }

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
