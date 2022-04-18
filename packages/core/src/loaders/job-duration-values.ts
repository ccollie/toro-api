import { Queue, RedisClient } from 'bullmq';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import { JobStatus } from '../types';
import { Scripts } from '../commands';
import { getAccessor } from './accessors';

export interface JobMemoryLoaderKey {
  queue: Queue;
  state: JobStatus;
  limit?: number;
  jobName?: string;
}

export interface JobMemoryLoaderResult {
  byteCount: number;
  jobCount: number;
  iterations: number;
}

function cacheFn(key: JobMemoryLoaderKey): string {
  const { getQueueId } = getAccessor();
  const { queue, state, limit = 0, jobName = '' } = key;
  const qid = getQueueId(queue);
  return `${qid}:${state}:${limit}:${jobName}`;
}

function parseResult(
  res: [Error | null, Array<number>],
): JobMemoryLoaderResult {
  // ignore error
  const [byteCount = 0, jobCount = 0, iterations = 0] = res[1] ?? [0, 0, 0];

  return { byteCount, jobCount, iterations };
}

async function getSingle(
  key: JobMemoryLoaderKey,
): Promise<JobMemoryLoaderResult[]> {
  const { queue, jobName, limit, state } = key;
  const client = await queue.client;
  const args = Scripts.getKeysMemoryUsageArgs(queue, state, limit, jobName);
  const [byteCount = 0, jobCount = 0, iterations = 0] = await (
    client as any
  ).getKeysMemoryUsage(...args);
  const result = { byteCount, jobCount, iterations };
  return [result];
}

async function getJobMemoryBatch(
  keys: JobMemoryLoaderKey[],
): Promise<JobMemoryLoaderResult[]> {
  if (keys.length === 1) {
    return getSingle(keys[0]);
  }
  const { getQueueHostClient } = getAccessor();
  const keyIndexMap = new Map<JobMemoryLoaderKey, number>();
  const hostKeys = new Map<RedisClient, JobMemoryLoaderKey[]>();

  keys.forEach((key, index) => {
    const client = getQueueHostClient(key.queue);
    keyIndexMap.set(key, index);
    let queues = hostKeys.get(client);
    if (!queues) {
      queues = [];
      hostKeys.set(client, queues);
    }
    queues.push(key);
  });
  const result = [];

  await pMap(hostKeys, async ([client, keys]) => {
    const pipeline = client.pipeline();
    keys.forEach((key) => {
      const { queue, jobName, limit, state } = key;
      const args = Scripts.getKeysMemoryUsageArgs(queue, state, limit, jobName);
      (pipeline as any).getKeysMemoryUsage(...args);
    });
    const res = await pipeline.exec();
    keys.forEach((key, i) => {
      const index = keyIndexMap.get(key);
      result[index] = parseResult(res[i]);
    });
  });

  return result;
}

export const jobMemoryUsage = new DataLoader(getJobMemoryBatch, {
  cacheKeyFn: cacheFn,
});

export function getJobMemoryUsage(opts: JobMemoryLoaderKey): Promise<JobMemoryLoaderResult> {
  return jobMemoryUsage.load(opts);
}
