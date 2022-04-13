import { useGetQueueJobCountsQuery } from '@/types';
import { useCallback, useMemo } from 'react';
import type { JobStatus, Queue, CountStatus } from '@/types';
import { useNetworkSettingsStore } from 'src/stores';
import { useQueueSessionStore } from '../stores';
import { useQueue } from '@/hooks';

export const useQueueCounts = (queueId: Queue['id'], autoUpdate = false) => {
  const { queue, updateQueue } = useQueue(queueId);
  const activeStatus = useQueueSessionStore(useCallback(x => x.getQueueStatus, [queueId]));
  const changeStatus = useQueueSessionStore(x => x.setQueueStatus);
  const pollInterval = useNetworkSettingsStore(x => x.pollingInterval);

  useGetQueueJobCountsQuery({
    variables: {
      queueId
    },
    pollInterval,
    nextFetchPolicy: 'cache-and-network',
    skip: !autoUpdate,
    onCompleted: (data) => {
      if (data.queue) {
        const { jobCounts } = data.queue;
        const { __typename, ...counts } = jobCounts;
        updateQueue({
          jobCounts: {
            ...queue.jobCounts,
            ...counts
          }
        });
      }
    }
  });

  const handleClick = useCallback((status: CountStatus) => {
    // todo: navigate ???
      changeStatus(queueId, status as JobStatus);
  }, [queueId]);

  return useMemo(() => {
    if (!queue?.jobCounts) {
      return [];
    }
    const { __typename, ...counts } = queue.jobCounts;
    return Object.entries(counts).map(([status, count]) => ({
      label: status,
      value: count,
      onClick: () => handleClick(status),
      isActive: status == `${activeStatus}`,
    }));
  }, [queue.jobCounts, activeStatus]);
};
