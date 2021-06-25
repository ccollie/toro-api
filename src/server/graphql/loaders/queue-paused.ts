import { Queue } from 'bullmq';
import pMap from 'p-map';
import { getPipelinePaused } from '@server/queues';
import DataLoader from 'dataloader';
import { aggregateQueuesByHost, mapQueuesToIndex, queueCacheFn } from './utils';
import { RegisterFn } from './types';

async function getQueuePausedBatch(queues: Queue[]): Promise<boolean[]> {
  if (queues.length === 1) {
    const paused = await queues[0].isPaused();
    return [paused];
  }
  const result: boolean[] = [];
  const queueIndexMap = mapQueuesToIndex(queues);
  const hostQueues = aggregateQueuesByHost(queues);

  await pMap(hostQueues, async ([h, queues]) => {
    const paused = await getPipelinePaused(h.client, queues);
    queues.forEach((queue, i) => {
      const index = queueIndexMap.get(queue);
      result[index] = paused[i];
    });
  });

  return result;
}

export default function registerLoaders(register: RegisterFn): void {
  const queuePausedFactory = () =>
    new DataLoader(getQueuePausedBatch, {
      cacheKeyFn: queueCacheFn,
    });
  register('queuePaused', queuePausedFactory);
}
