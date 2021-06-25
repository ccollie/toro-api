import { Queue } from 'bullmq';
import DataLoader from 'dataloader';
import { JobCounts, JobCountStates, JobStatusEnum } from '@src/types';
import { getQueueById, getQueueId } from '@server/graphql/helpers';
import { aggregateQueuesByHost } from './utils';
import { getPipelinedCounts } from '@server/queues';
import { RegisterFn } from './types';
import pMap from 'p-map';

const DefaultTypes: JobCountStates[] = [
  JobStatusEnum.DELAYED,
  JobStatusEnum.PAUSED,
  JobStatusEnum.WAITING,
];

export interface JobCountsLoaderKey {
  queue: Queue | string;
  types?: JobCountStates[];
}

interface QueueJobCountsMeta {
  types: string[];
  index: number;
}

function jobCountsLoaderCacheFn(key: JobCountsLoaderKey): string {
  const queueId =
    typeof key.queue === 'string' ? key.queue : getQueueId(key.queue);
  const types = key.types ? key.types.sort() : DefaultTypes;
  const typeStr = types.join(',');
  return `${queueId}:${typeStr}`;
}

async function getSingle(key: JobCountsLoaderKey): Promise<JobCounts[]> {
  let queue = key.queue;
  if (typeof queue === 'string') {
    queue = getQueueById(queue);
  }
  const counts = (await queue.getJobCounts(...key.types)) as JobCounts;
  return [counts];
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
    if (typeof queue === 'string') {
      queue = getQueueById(queue);
    }
    queues.push(queue);
    let metas = queueTypesMap.get(queue);
    if (!metas) {
      metas = [];
      queueTypesMap.set(queue, metas);
    }
    metas.push(meta);
    result[index] = empty;
  });

  const hostQueues = aggregateQueuesByHost(queues);
  await pMap(hostQueues, async ([host, queues]) => {
    const client = host.client;
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
          counts[type as JobCountStates] = amt || 0;
        });
        result[meta.index] = counts as JobCounts;
      });
    });
  });

  return result;
}

export default function registerLoaders(register: RegisterFn): void {
  const jobCountsLoaderFactory = () =>
    new DataLoader(getJobCountsBatch, {
      cacheKeyFn: jobCountsLoaderCacheFn,
    });

  const jobCountByTypeFactory = (jobCounts) => {
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

    return new DataLoader(getJobCountByTypes, {
      cacheKeyFn: jobCountsLoaderCacheFn,
    });
  };

  register('jobCounts', jobCountsLoaderFactory);
  register('jobCountByTpe', jobCountByTypeFactory, ['jobCounts']);
}
