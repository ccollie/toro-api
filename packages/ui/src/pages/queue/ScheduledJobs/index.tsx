import { LocationGenerics, useGetRepeatableJobsQuery } from '@/types';
import { LoadingOverlay } from '@mantine/core';
import React, {
  useState,
  useEffect,
  useCallback, Fragment,
} from 'react';
import type { RepeatableJob } from '@/types';
import { deleteRepeatableJobByKey } from '@/services';
import { useMatch } from '@tanstack/react-location';
import { Pagination } from '@/components/Pagination';
import { NoJobsData } from 'src/pages/queue/jobs/List/NoJobsData';
import { ScheduledJobsTable } from './Table';
import { getPollingInterval } from '@/stores/network-settings';

export const ScheduledJobs = () => {
  const {
    params: { queueId } ,
    search: { page = 1, pageSize = 10 }
  } = useMatch<LocationGenerics>();

  const [data, setData] = useState<RepeatableJob[]>([]);
  const [count, setCount] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(0);
  const [offset, setOffset] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setOffset(pageSize * (Math.min(page, 1) - 1));
  }, [page, pageSize]);

  useEffect(() => {
    setPageCount(Math.ceil(count / pageSize));
  }, [count, pageSize]);

  const pollingInterval = getPollingInterval() || 5000;

  const { loading, refetch, called } = useGetRepeatableJobsQuery({
    variables: {
      queueId,
      offset,
      limit: pageSize,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: pollingInterval,
    onCompleted: (data) => {
      setData(data.queue?.repeatableJobs as RepeatableJob[]);
      setCount(data.queue?.repeatableJobCount ?? 0);
      setIsRefreshing(false);
    },
    onError: (error) => {
      console.error(error);
      setIsRefreshing(false);
    },
  });

  useEffect(() => {
    if (loading && called) {
      setIsRefreshing(true);
    } else {
      setIsRefreshing(false);
    }
  }, [called, loading, refetch]);

  const handleDelete = useCallback((key: string): Promise<void> =>{
    return deleteRepeatableJobByKey(queueId, key).then(() => {
      refetch().catch(console.error);
    });
  }, [queueId]);

  return (
    <div>
      <LoadingOverlay visible={loading}/>
      {(data.length === 0 && !loading && called) ? (
        <NoJobsData />
      ) : (
        <Fragment>
          <ScheduledJobsTable jobs={data} onDelete={handleDelete} loading={loading}/>
          {pageCount > 0 && (
            <div className="float-right mt-5">
              <Pagination page={page} pageCount={pageCount}/>
            </div>
          )}
        </Fragment>
      )}
    </div>
  );
};

export default ScheduledJobs;
