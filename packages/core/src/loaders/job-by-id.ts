import pMap from 'p-map';
import DataLoader from 'dataloader';
import { Queue, Job } from 'bullmq';
import { jobLocatorCacheFn } from './utils';
import { systemClock } from '../lib';
import { isEmpty } from 'lodash';
import { JobByIdLoaderKey } from './types';

async function getQueueJobsById(
  queue: Queue,
  ...ids: (string | string[])[]
): Promise<Job[]> {
  const flat = [].concat(...ids);
  const client = await queue.client;
  const multi = client.multi();
  flat.forEach((jid) => {
    multi.hgetall(queue.toKey(jid));
  });
  const res = await multi.exec();
  const result: Job<any, any>[] = [];
  const now = systemClock.getTime();
  res.forEach((item, index) => {
    if (item[0]) {
      // err
    } else {
      const jobData = item[1];
      const jid = flat[index];
      if (!isEmpty(jobData)) {
        const job = Job.fromJSON(queue, jobData, jid);
        job.timestamp = parseInt(jobData.timestamp || now);
        result.push(job);
      }
    }
  });
  return result;
}

const batchGetJobsById = async (keys: JobByIdLoaderKey[]) => {
  const idsByQueue = new Map<Queue, Map<string, number>>();
  keys.forEach(({ queue, id }, index) => {
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
    const jobs = await getQueueJobsById(queue, ids);
    jobs.forEach((job) => {
      const index = metas.get(job.id);
      result[index] = job;
    });
  });

  return result;
};

export const jobById = new DataLoader(batchGetJobsById, {
  cacheKeyFn: jobLocatorCacheFn,
});
