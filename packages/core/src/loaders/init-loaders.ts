import { IAccessorHelper, setAccessor } from './accessors';
import {
  getJobQueue,
  getQueueById,
  getQueueHost,
  getQueueId,
  getQueueManager,
} from '../supervisor/accessors';
import { Queue, RedisClient } from 'bullmq';

let initDone = false;

export function initLoaders(): void {
  if (initDone) return;
  initDone = true;
  const accessor: IAccessorHelper = {
    getJobQueue,
    getQueueId,
    getQueueById,
    getQueueManager,
    getQueueHostClient(queue: Queue): RedisClient {
      const host = getQueueHost(queue);
      return host.client;
    },
  };
  setAccessor(accessor);
}
