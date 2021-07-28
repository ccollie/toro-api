import { Queue } from 'bullmq';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import { RegisterFn } from './types';
import { getQueueId, getQueueManager } from '../helpers';
import { HostManager, Scripts } from '@alpen/core';
import { DataLoaderRegistry } from './registry';
import { JobStatusEnum } from '@alpen/core';

export interface JobMemoryLoaderKey {
  queue: Queue;
  state: JobStatusEnum;
  limit?: number;
  jobName?: string;
}

export interface JobMemoryLoaderResult {
  byteCount: number;
  jobCount: number;
  iterations: number;
}

function cacheFn(key: JobMemoryLoaderKey): string {
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
  const keyIndexMap = new Map<JobMemoryLoaderKey, number>();
  const hostKeys = new Map<HostManager, JobMemoryLoaderKey[]>();

  keys.forEach((key, index) => {
    const host = getQueueManager(key.queue).hostManager;
    keyIndexMap.set(key, index);
    let queues = hostKeys.get(host);
    if (!queues) {
      queues = [];
      hostKeys.set(host, queues);
    }
    queues.push(key);
  });
  const result = [];

  await pMap(hostKeys, async ([h, keys]) => {
    const pipeline = h.client.pipeline();
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

export default function registerLoaders(register: RegisterFn): void {
  const queuePausedFactory = () =>
    new DataLoader(getJobMemoryBatch, {
      cacheKeyFn: cacheFn,
    });
  register('jobMemoryUsage', queuePausedFactory);
}

export async function getJobMemoryUsage(
  loaders: DataLoaderRegistry,
  queue: Queue,
  state: JobStatusEnum,
  limit?: number,
  jobName?: string,
): Promise<JobMemoryLoaderResult> {
  const loader = loaders.getLoader<
    JobMemoryLoaderKey,
    JobMemoryLoaderResult,
    string
  >('jobMemoryUsage');
  const key: JobMemoryLoaderKey = {
    queue,
    state,
    limit,
    jobName,
  };
  return loader.load(key);
}

export async function getJobMemoryAvg(
  loaders: DataLoaderRegistry,
  queue: Queue,
  state: JobStatusEnum,
  limit?: number,
  jobName?: string,
): Promise<number> {
  const { byteCount, jobCount } = await getJobMemoryUsage(
    loaders,
    queue,
    state,
    limit,
    jobName,
  );
  return byteCount / (jobCount || 1);
}
