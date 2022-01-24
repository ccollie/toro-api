import { LocationGenerics } from '@/types';
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import type { RepeatableJob } from '@/types';
import { deleteRepeatableJobByKey, getRepeatableJobs } from '@/services';
import { useMatch } from 'react-location';
import { useInterval } from '@/hooks';
import { Pagination } from '@/components/Pagination/Pagination';
import { ScheduledJobsTable } from './JobsTable';
import { getPollingInterval } from 'src/stores/network-settings';

export const ScheduledJobs: React.FC = () => {
  const {
    params: { queueId } ,
    search: { page = 1, pageSize = 10 }
  } = useMatch<LocationGenerics>();

  const [data, setData] = useState<RepeatableJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [called, setCalled] = useState(false);
  const pagination = useRef<{
    current: number;
    pageSize: number;
    total: number;
    pageCount: number;
  }>({
    current: page,
    pageSize,
    total: 0,
    pageCount: 0,
  });

  const pollingInterval = getPollingInterval() || 25000;

  const handleDelete = useCallback((key: string): Promise<void> =>{
    return deleteRepeatableJobByKey(queueId, key).then(() => {
      fetch();
    });
  }, [queueId]);

  function fetchJobs(pageNumber: number, pageSize: number): void {
    if (loading) return;
    const { current } = pagination;
    setLoading(true);
    getRepeatableJobs(queueId, pageNumber, pageSize)
      .then(({ count, jobs }) => {
        setCalled(true);
        setData(jobs);
        current.current = page;
        current.pageSize = pageSize;
        current.total = count;
        current.pageCount = Math.ceil(count / pageSize);
      })
      .catch((err) => {
        // todo: toast
        console.log(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function fetch() {
    const { current, pageSize } = pagination.current;
    if (!loading && called) {
      fetchJobs(current, pageSize);
    }
  }

  useEffect(() => {
    const { current, pageSize } = pagination.current;
    if (!loading) {
      fetchJobs(current, pageSize);
    }
  }, []);

  useInterval(fetch, pollingInterval, { immediate: true });

  return (
    <div>
      <ScheduledJobsTable jobs={data} onDelete={handleDelete} loading={loading}/>
      {pagination.current.pageCount > 0 && (
        <div className="float-right mt-5">
          <Pagination page={pagination.current.current} pageCount={pagination.current.pageCount}/>
        </div>
      )}
    </div>
  );
};

export default ScheduledJobs;
