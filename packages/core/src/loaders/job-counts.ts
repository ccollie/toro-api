import { Queue, JobType } from 'bullmq';
import { Pipeline } from 'ioredis';
import DataLoader from 'dataloader';
import { aggregateQueuesByClient } from './utils';
import pMap from 'p-map';
import { JobCounts } from '../types/queues';
import { getAccessor } from './accessors';

const DefaultTypes: JobType[] = ['delayed', 'paused', 'waiting'];

export interface JobCountsLoaderKey {
  queue: Queue;
  types?: JobType[];
}

interface QueueJobCountsMeta {
  types: JobType[];
  index: number;
}

function jobCountsLoaderCacheFn(key: JobCountsLoaderKey): string {
  const { getQueueId } = getAccessor();
  const queueId =
    typeof key.queue === 'string' ? key.queue : getQueueId(key.queue);
  const types = key.types ? key.types.sort() : DefaultTypes;
  const typeStr = types.join(',');
  return `${queueId}:${typeStr}`;
}

async function getSingle(key: JobCountsLoaderKey): Promise<JobCounts[]> {
  const queue = key.queue;
  const counts = (await queue.getJobCounts(...key.types)) as JobCounts;
  return [counts];
}

function getPipelinedCounts(
  pipeline: Pipeline,
  queue: Queue,
  types: string[],
): Pipeline {
  types.forEach((type: string) => {
    type = type === 'waiting' ? 'wait' : type; // alias

    const key = queue.toKey(type);
    switch (type) {
      case 'completed':
      case 'failed':
      case 'delayed':
      case 'repeat':
      case 'waiting-children':
        pipeline.zcard(key);
        break;
      case 'active':
      case 'wait':
      case 'paused':
        pipeline.llen(key);
        break;
    }
  });

  return pipeline;
}

async function getJobCountsBatch(
  keys: JobCountsLoaderKey[],
): Promise<JobCounts[]> {
  // shortcut for single key
  if (keys.length === 1) {
    return getSingle(keys[0]);
  }
  const result: JobCounts[] = [];
  const queues: Queue[] = [];
  const queueTypesMap = new Map<Queue, QueueJobCountsMeta[]>();
  const empty = Object.create(null);
  keys.forEach(({ queue, types }, index) => {
    const meta = { types, index };
    queues.push(queue);
    let metas = queueTypesMap.get(queue);
    if (!metas) {
      metas = [];
      queueTypesMap.set(queue, metas);
    }
    metas.push(meta);
    result[index] = empty;
  });

  const clientQueues = aggregateQueuesByClient(queues);
  await pMap(clientQueues, async ([client, queues]) => {
    const pipeline = client.pipeline();
    queues.forEach((queue) => {
      const metas = queueTypesMap.get(queue);
      metas.forEach(
        (meta) => void getPipelinedCounts(pipeline, queue, meta.types),
      );
    });

    const res = await pipeline.exec();
    let index = 0;
    queues.forEach((queue) => {
      const metas = queueTypesMap.get(queue);
      metas.forEach((meta) => {
        const counts = {};
        meta.types.forEach((type) => {
          const item = res[index++];
          const [error, amt] = item;
          // todo: throw on error
          counts[type as JobType] = amt || 0;
        });
        result[meta.index] = counts as JobCounts;
      });
    });
  });

  return result;
}

export const jobCounts = new DataLoader(getJobCountsBatch, {
  cacheKeyFn: jobCountsLoaderCacheFn,
});

// Job counts by type
// getJobCountByTypes(queue, 'completed') => completed count
// getJobCountByTypes(queue, 'completed,failed') => completed + failed count
// getJobCountByTypes(queue, 'completed', 'failed') => completed + failed count
// getJobCountByTypes(queue, 'completed', 'waiting', 'failed') => completed+waiting+failed count
async function getJobCountByTypes(
  keys: JobCountsLoaderKey[],
): Promise<number[]> {
  const countsByKey = (await jobCounts.loadMany(keys)) as JobCounts[];
  return countsByKey.map((counts) => {
    // we won't raise on error
    if (counts instanceof Error) return 0;
    return Object.values(counts).reduce((sum, count) => sum + count);
  });
}

export const jobCountsByType = new DataLoader(getJobCountByTypes, {
  cacheKeyFn: jobCountsLoaderCacheFn,
});

export async function getJobCounts(
  queue: Queue,
  states?: JobType[],
): Promise<Record<string, number>> {
  const key = {
    queue,
    types: states,
  };
  return (await jobCounts.load(key)) as Record<string, number>;
}
