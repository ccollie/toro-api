import { Job, Queue, RedisClient } from 'bullmq';
import { JobByIdLoaderKey, JobLocator } from './types';
import { getAccessor, getQueueHostClient, getQueueId } from './accessors';

// todo: load accessors dynamically

export function aggregateQueuesByClient(
  queues: Queue[],
): Map<RedisClient, Queue[]> {
  const result = new Map<RedisClient, Queue[]>();
  queues.forEach((queue) => {
    const client = getQueueHostClient(queue);
    let clientQueues = result.get(client);
    if (!clientQueues) {
      clientQueues = [];
      result.set(client, clientQueues);
    }
    clientQueues.push(queue);
  });
  return result;
}

export function mapQueuesToIndex(queues: Queue[]): Map<Queue, number> {
  const result = new Map<Queue, number>();
  queues.forEach((queue, index) => void result.set(queue, index));
  return result;
}

export function normalizeJobLocator(candidate: JobLocator): JobByIdLoaderKey {
  const { getJobQueue } = getAccessor();
  if (candidate instanceof Job) {
    const queue = getJobQueue(candidate);
    return {
      queue,
      id: candidate.id,
    };
  }
  return candidate;
}

export function jobLocatorCacheFn(key: JobLocator): string {
  const { queue, id } = normalizeJobLocator(key);
  const queueId = typeof queue === 'string' ? queue : getQueueId(queue);
  return `${queueId}:${id}`;
}
