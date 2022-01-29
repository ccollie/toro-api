import { useStore } from '@/stores/hosts';
import { useCallback } from 'react';
import { Queue } from '@/types';

export function useQueue(queueId: Queue['id']) {
  const queue = useStore(useCallback(state => state.findQueue(queueId), [queueId]));
  const update = useStore(state => state.updateQueue);

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

  return { queue, updateQueue };
}
