import { Job, Queue, RedisClient } from 'bullmq';
import { JobLocator } from './types';
import boom from '@hapi/boom';
import { QueueManager } from '../queues';

export interface IAccessorHelper {
  getJobQueue: (job: JobLocator) => Queue;
  getQueueId: (queue: Queue) => string;
  getQueueById: (queue: string) => Queue;
  getQueueHostClient: (queue: Queue) => RedisClient;
  getQueueManager: (queue: Queue | string) => QueueManager;
}

const DefaultAccessor: IAccessorHelper = {
  getJobQueue(job: JobLocator): Queue {
    if (job instanceof Job) {
      // todo: this is brittle
      const queue = (job as any).queue as Queue;
      if (!queue) {
        const msg = `No queue found for Job ${job.name}#${job.id}`;
        throw boom.notFound(msg);
      }
      return queue;
    } else {
      return job.queue;
    }
  },
  getQueueId(queue: Queue): string {
    // todo:
    return '';
  },
  getQueueManager(_queue): QueueManager {
    throw boom.notImplemented('"getQueueManager" not implemented');
  },
  getQueueById(id: string): Queue {
    throw boom.notImplemented('"getQueueById" not implemented');
  },
  getQueueHostClient(queue: Queue): RedisClient {
    throw boom.notImplemented('"getQueueHostClient" not implemented');
  },
};

let accessor: IAccessorHelper = DefaultAccessor;

export function getAccessor(): IAccessorHelper {
  return accessor;
}

export function setAccessor(value: IAccessorHelper): IAccessorHelper {
  return (accessor = value);
}

export function getJobQueue(job: JobLocator): Queue {
  return accessor.getJobQueue(job);
}

export function getQueueId(queue: Queue): string {
  return accessor.getQueueId(queue);
}

export function getQueueById(id: string): Queue {
  return accessor.getQueueById(id);
}

export function getQueueHostClient(queue: Queue): RedisClient {
  return accessor.getQueueHostClient(queue);
}

export function getQueueManager(queue: string | Queue): QueueManager {
  return accessor.getQueueManager(queue);
}