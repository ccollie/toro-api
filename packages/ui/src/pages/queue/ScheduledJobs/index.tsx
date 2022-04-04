import { LocationGenerics, useGetRepeatableJobsQuery } from '@/types';
import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { RepeatableJob } from '@/types';
import { deleteRepeatableJobByKey } from '@/services';
import { useMatch } from '@tanstack/react-location';
import { Pagination } from '@/components/Pagination';
import { ScheduledJobsTable } from './JobsTable';
import { getPollingInterval } from 'src/stores/network-settings';

export const ScheduledJobs = () => {
  const {
    params: { queueId } ,
    search: { page = 1, pageSize = 10 }
  } = useMatch<LocationGenerics>();

  const [data, setData] = useState<RepeatableJob[]>([]);
  const [count, setCount] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(pageSize * (Math.min(page, 1) - 1));
  }, [page, pageSize]);

  useEffect(() => {
    setPageCount(Math.ceil(count / pageSize));
  }, [count, pageSize]);

  const pollingInterval = getPollingInterval() || 5000;

  const { loading, refetch } = useGetRepeatableJobsQuery({
    variables: {
      id: queueId,
      offset: offset,
      limit: pageSize,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: pollingInterval,
    onCompleted: (data) => {
      setData(data.queue?.repeatableJobs as RepeatableJob[]);
      setCount(data.queue?.repeatableJobCount ?? 0);
    },
  });

  const handleDelete = useCallback((key: string): Promise<void> =>{
    return deleteRepeatableJobByKey(queueId, key).then(() => {
      refetch();
    });
  }, [queueId]);

  return (
    <div>
      <ScheduledJobsTable jobs={data} onDelete={handleDelete} loading={loading}/>
      {pageCount > 0 && (
        <div className="float-right mt-5">
          <Pagination page={page} pageCount={pageCount}/>
        </div>
      )}
    </div>
  );
};

export default ScheduledJobs;
