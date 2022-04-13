import { useStore } from '@/stores/hosts';
import { useCallback, useEffect, useState } from 'react';
import { CountStatus, Queue } from '@/types';

export function useQueue(queueId: Queue['id']) {
  const findQueue = useStore(store => store.findQueue);
  const update = useStore(state => state.updateQueue);
  const [queue, setQueue] = useState<Queue | null>(findQueue(queueId) ?? null);

  useEffect(() => {
    if (queueId) {
      setQueue(findQueue(queueId) ?? null);
    }
  }, [queueId]);

  const updateQueue = useCallback(
    (delta: Partial<Queue>) => {
      update(queueId, delta);
    },
    [queueId]
  );

  if (!queue) {
    // todo load from backend
    throw new Error(
      'useQueue must be used within a QueueProvider'
    );
  }

  const decreaseJobCount = useCallback((status: CountStatus) => {
    // @ts-ignore
    const count = (queue.jobCounts[status] || 0) - 1;
    if (count >= 0) {
      updateQueue({
        jobCounts: {
          ...queue.jobCounts,
          [''+status]: count,
        },
      });
    }
  }, [queue]);

  return { queue, updateQueue, decreaseJobCount };
}
