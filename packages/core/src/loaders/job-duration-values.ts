import { Queue, RedisClient } from 'bullmq';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import {
  JobDurationValuesResult,
  parseDurationValues,
  Scripts,
} from '../commands';
import { getAccessor } from './accessors';

export interface JobDurationLoaderKey {
  queue: Queue;
  start: number;
  end: number;
  jobName?: string;
}

function cacheFn(key: JobDurationLoaderKey): string {
  const { getQueueId } = getAccessor();
  const { queue, start, end, jobName = '' } = key;
  const qid = getQueueId(queue);
  return `${qid}:${start}:${end}:${jobName}`;
}

async function getSingle(
  key: JobDurationLoaderKey,
): Promise<JobDurationValuesResult[]> {
  const { queue, jobName, start, end } = key;
  const result = await Scripts.getJobDurationValues(queue, start, end, jobName);
  return [result];
}

async function getJobDurationBatch(
  keys: JobDurationLoaderKey[],
): Promise<JobDurationValuesResult[]> {
  if (keys.length === 1) {
    return getSingle(keys[0]);
  }
  const { getQueueHostClient } = getAccessor();
  const keyIndexMap = new Map<JobDurationLoaderKey, number>();
  const hostKeys = new Map<RedisClient, JobDurationLoaderKey[]>();

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
      const { queue, jobName, start, end } = key;
      // todo: pipeline this
      const args = Scripts.getJobDurationValuesArgs(queue, 'completed', start, end, jobName);
      (pipeline as any).getDurationValues(...args);
    });
    const res = await pipeline.exec();
    keys.forEach((key, i) => {
      const index = keyIndexMap.get(key);
      result[index] = parseDurationValues(res[i]);
    });
  });

  return result;
}

export const jobDurationValues = new DataLoader(getJobDurationBatch, {
  cacheKeyFn: cacheFn,
});

export function getJobDurationValues(
  opts: JobDurationLoaderKey,
): Promise<JobDurationValuesResult> {
  return jobDurationValues.load(opts);
}
