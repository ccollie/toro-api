import { useCallback, useMemo } from 'react';
import { useStore } from 'src/stores';
import type { QueueHost } from 'src/types';

export const useQueuePrefixes = (hostId: QueueHost['id']) =>{
  const host = useStore(useCallback(x => x.findHost(hostId), [hostId]));
  return useMemo(() => {
    if (!host) return [];
    const { queues } = host;
    if (!queues) return [];
    const values = new Set<string>(queues.map(x => x.prefix).filter(Boolean));
    const uniq = [...values];
    return uniq.sort();
  }, [host?.queues]);
};
