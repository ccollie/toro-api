import { useCallback, useMemo } from 'react';
import type { Status, Queue, CountStatus } from '@/types';
import { useQueueSessionStore } from '../stores';
import { useQueue } from '@/hooks';

export const useQueueCounts = (queueId: Queue['id']) => {
  const { queue } = useQueue(queueId);
  const activeStatus = useQueueSessionStore(useCallback(x => x.getQueueStatus, [queueId]));
  const changeStatus = useQueueSessionStore(x => x.setQueueStatus);

  const handleClick = useCallback((status: CountStatus) => {
    // todo: navigate ???
      changeStatus(queueId, status as Status);
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
