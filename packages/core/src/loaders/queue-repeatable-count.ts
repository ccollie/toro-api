import { Queue } from 'bullmq';
import { Pipeline } from 'ioredis';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import { aggregateQueuesByClient, mapQueuesToIndex } from './utils';

function enqueueFetch(pipeline: Pipeline, queue: Queue) {
  const key = queue.toKey('repeat');
  pipeline.zcard(key);
}

function parseResult(res: [Error | null, number]): number {
  // ignore error
  return res[1] ?? 0;
}

async function getSingle(queue: Queue): Promise<number[]> {
  const repeat = await queue.repeat;
  const count = await repeat.getRepeatableCount();
  return [count];
}

async function getRepeatableCounts(queues: Queue[]): Promise<number[]> {
  if (queues.length === 1) {
    return getSingle(queues[0]);
  }
  const hostQueues = aggregateQueuesByClient(queues);
  const queueIndexMap = mapQueuesToIndex(queues);
  const result = new Array<number>(queues.length).fill(0);

  await pMap(hostQueues, async ([client, queues]) => {
    const pipeline = client.pipeline();
    queues.forEach((queue) => void enqueueFetch(pipeline, queue));
    const res = await pipeline.exec();

    let i = 0;
    queues.forEach((queue) => {
      const index = queueIndexMap.get(queue);
      result[index] = parseResult(res[i++]);
    });
  });
  return result;
}

export const queueRepeatableCount = new DataLoader(getRepeatableCounts);

export function getQueueRepeatableCount(queue: Queue): Promise<number> {
  return queueRepeatableCount.load(queue);
}
