import pMap from 'p-map';
import DataLoader from 'dataloader';
import { Queue, Job } from 'bullmq';
import { getMultipleJobsById, JobIdSpec } from '@alpen/core';
import { ensureQueue, jobLocatorCacheFn } from './utils';
import { RegisterFn } from './types';

const batchGetJobsById = async (keys: JobIdSpec[]) => {
  const idsByQueue = new Map<Queue, Map<string, number>>();
  keys.forEach(({ queue, id }, index) => {
    queue = ensureQueue(queue);
    let ids = idsByQueue.get(queue);
    if (!ids) {
      ids = new Map<string, number>();
      idsByQueue.set(queue, ids);
    }
    ids.set(id, index);
  });
  const result = new Array<Job>(keys.length).fill(null); // fill with not found error ???
  await pMap(idsByQueue.keys(), async (queue) => {
    const metas = idsByQueue.get(queue);
    const ids = Array.from(metas.keys());
    const jobs = await getMultipleJobsById(queue, ids);
    jobs.forEach((job) => {
      const index = metas.get(job.id);
      result[index] = job;
    });
  });

  return result;
};

export default function registerLoaders(register: RegisterFn): void {
  const factory = () =>
    new DataLoader(batchGetJobsById, {
      cacheKeyFn: jobLocatorCacheFn,
    });
  register('jobById', factory);
}
