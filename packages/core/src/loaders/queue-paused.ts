import { Queue, RedisClient } from 'bullmq';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import { aggregateQueuesByClient, mapQueuesToIndex } from './utils';

async function getPipelinePaused(
  client: RedisClient,
  queues: Queue[],
): Promise<boolean[]> {
  const pipeline = client.pipeline();
  queues.forEach((queue) => {
    pipeline.hexists(queue.keys.meta, 'paused');
  });
  const res = await pipeline.exec();
  const result: boolean[] = [];

  res.forEach((item) => {
    if (item[0]) {
      // error. Todo: throw
      result.push(false);
    } else {
      result.push(item[1] === 1);
    }
  });

  return result;
}

async function getQueuePausedBatch(queues: Queue[]): Promise<boolean[]> {
  if (queues.length === 1) {
    const paused = await queues[0].isPaused();
    return [paused];
  }
  const result: boolean[] = [];
  const queueIndexMap = mapQueuesToIndex(queues);
  const hostQueues = aggregateQueuesByClient(queues);

  await pMap(hostQueues, async ([client, queues]) => {
    const paused = await getPipelinePaused(client, queues);
    queues.forEach((queue, i) => {
      const index = queueIndexMap.get(queue);
      result[index] = paused[i];
    });
  });

  return result;
}

export const queuePausedLoader = new DataLoader(getQueuePausedBatch);

export function getQueuePaused(queue: Queue): Promise<boolean> {
  return queuePausedLoader.load(queue);
}
