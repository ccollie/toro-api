import { useStore } from '@/stores/hosts';
import { HostActions, QueueHost } from '@/types';
import { discoverQueues, registerQueue, unregisterQueue } from '@/services';
import { useCallback } from 'react';

export function useHostActions(hostId: QueueHost['id']): HostActions {
  const hostsStore = useStore();

  // todo: confirm

  const register = useCallback((prefix: string, name: string) => {
    return registerQueue(hostId, prefix, name, true).then((queue) => {
      hostsStore.addQueue(hostId, queue);
      return queue;
    });
  }, [hostId]);

  const discover = useCallback((prefix?: string, unregisteredOnly?: boolean) => {
    return discoverQueues(hostId, prefix, unregisteredOnly);
  }, [hostId]);


  return {
    discoverQueues: discover,
    registerQueue: register,
    unregisterQueue,
  };
}
