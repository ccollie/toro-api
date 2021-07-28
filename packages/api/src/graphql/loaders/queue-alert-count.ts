import { Queue } from 'bullmq';
import { aggregateQueuesByHost, mapQueuesToIndex, queueCacheFn } from './utils';
import { Pipeline } from 'ioredis';
import { getQueueAlertCountKey } from '@alpen/core';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import { RegisterFn } from './types';
import { RuleScripts } from '@alpen/core';
import { DataLoaderRegistry } from './registry';

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
  const queuesByHost = aggregateQueuesByHost(queues);
  const queueIndexMap = mapQueuesToIndex(queues);
  const result = new Array<number>(queues.length).fill(0);

  await pMap(queuesByHost, async ([host, queues]) => {
    const pipeline = host.client.pipeline();
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
const LOADER_NAME = 'queueAlertCount';

export default function registerLoaders(register: RegisterFn): void {
  const queueAlertCountFactory = () =>
    new DataLoader(getQueueAlertCounts, {
      cacheKeyFn: queueCacheFn,
    });

  register(LOADER_NAME, queueAlertCountFactory);
}

export function getQueueAlertCount(
  loaders: DataLoaderRegistry,
  queue: Queue,
): Promise<number> {
  const loader = loaders.getLoader<Queue, number, string>(LOADER_NAME);
  return loader.load(queue);
}
