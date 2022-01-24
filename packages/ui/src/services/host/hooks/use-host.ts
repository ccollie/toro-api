import { useStore } from '@/stores/hosts';
import { useCallback } from 'react';
import { QueueHost } from '@/types';

export function useHost(id: QueueHost['id']) {
  const host = useStore(useCallback(state => state.findHost(id), [id]));
  const update = useStore(state => state.updateHost);

  const updateHost = useCallback(
    (host: Partial<QueueHost>) => {
      update(id, host);
    },
    [update]
  );
  return { host, updateHost };
}
