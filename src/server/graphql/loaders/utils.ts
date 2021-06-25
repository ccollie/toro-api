import { HostManager } from '@server/hosts';
import { Queue } from 'bullmq';
import {
  getJobQueue,
  getQueueById,
  getQueueHostManager,
  getQueueId,
} from '@server/graphql/helpers';
import { isJobIdSpec, JobIdSpec } from '@src/types';
import { JobLocator } from './types';

export function aggregateQueuesByHost(
  queues: (Queue | string)[],
): Map<HostManager, Queue[]> {
  const result = new Map<HostManager, Queue[]>();
  queues.forEach((queue) => {
    if (typeof queue === 'string') {
      queue = getQueueById(queue);
    }
    const host = getQueueHostManager(queue);
    let hostQueues = result.get(host);
    if (!hostQueues) {
      hostQueues = [];
      result.set(host, hostQueues);
    }
    hostQueues.push(queue);
  });
  return result;
}

export function mapQueuesToIndex(queues: Queue[]): Map<Queue, number> {
  const result = new Map<Queue, number>();
  queues.forEach((queue, index) => void result.set(queue, index));
  return result;
}

export function ensureQueue(queue: Queue | string): Queue {
  if (typeof queue === 'string') return getQueueById(queue);
  return queue;
}

export function getJobIdSpec(candidate: JobLocator): JobIdSpec {
  if (!isJobIdSpec(candidate)) {
    const queue = getJobQueue(candidate);
    return {
      queue,
      id: candidate.id,
    };
  }
  return candidate;
}

export function jobLocatorCacheFn(key: JobLocator): string {
  const { queue, id } = getJobIdSpec(key);
  const queueId = typeof queue === 'string' ? queue : getQueueId(queue);
  return `${queueId}:${id}`;
}

export function queueCacheFn(queue: Queue): string {
  return getQueueId(queue);
}
