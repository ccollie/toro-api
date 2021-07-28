import { Queue } from 'bullmq';
import { aggregateQueuesByHost, mapQueuesToIndex, queueCacheFn } from './utils';
import { Pipeline } from 'ioredis';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import { RegisterFn } from './types';
import { DataLoaderRegistry } from './registry';

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
  const hostQueues = aggregateQueuesByHost(queues);
  const queueIndexMap = mapQueuesToIndex(queues);
  const result = new Array<number>(queues.length).fill(0);

  await pMap(hostQueues, async ([host, queues]) => {
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
const LOADER_NAME = 'queueRepeatableCount';

export default function registerLoaders(register: RegisterFn): void {
  const factory = () =>
    new DataLoader(getRepeatableCounts, {
      cacheKeyFn: queueCacheFn,
    });

  register(LOADER_NAME, factory);
}

export function getQueueRepeatableCount(
  loaders: DataLoaderRegistry,
  queue: Queue,
): Promise<number> {
  const loader = loaders.getLoader<Queue, number, string>(LOADER_NAME);
  return loader.load(queue);
}
