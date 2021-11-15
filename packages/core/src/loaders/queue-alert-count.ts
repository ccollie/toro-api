import { Queue } from 'bullmq';
import { Pipeline } from 'ioredis';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import { aggregateQueuesByClient, mapQueuesToIndex } from './utils';
import { getQueueAlertCountKey } from '../keys';
import { RuleScripts } from '../commands';

function enqueueFetch(pipeline: Pipeline, queue: Queue) {
  const key = getQueueAlertCountKey(queue);
  pipeline.get(key);
}

function parseResult(res: [Error | null, number]): number {
  // ignore error
  return res[1] ?? 0;
}

async function getQueueAlertCounts(queues: Queue[]): Promise<number[]> {
  if (queues.length === 1) {
    const count = await RuleScripts.getQueueAlertCount(queues[0]);
    return [count];
  }
  const queuesByHost = aggregateQueuesByClient(queues);
  const queueIndexMap = mapQueuesToIndex(queues);
  const result = new Array<number>(queues.length).fill(0);

  await pMap(queuesByHost, async ([client, queues]) => {
    const pipeline = client.pipeline();
    queues.forEach((queue) => { enqueueFetch(pipeline, queue); });
    const res = await pipeline.exec();

    let i = 0;
    queues.forEach((queue) => {
      const index = queueIndexMap.get(queue);
      result[index] = parseResult(res[i++]);
    });
  });
  return result;
}

export const queueAlertCount = new DataLoader(getQueueAlertCounts);
