import DataLoader from 'dataloader';
import { Queue } from 'bullmq';
import pMap from 'p-map';
import { jobLocatorCacheFn, normalizeJobLocator } from './utils';
import { JobLocator } from './types';
import { Scripts } from '../commands';

const batchGetJobStateById = async (keys: JobLocator[]) => {
  const idsByQueue = new Map<Queue, Map<string, number>>();
  keys.forEach((key, index) => {
    const { queue, id } = normalizeJobLocator(key);
    let ids = idsByQueue.get(queue);
    if (!ids) {
      ids = new Map<string, number>();
      idsByQueue.set(queue, ids);
    }
    ids.set(id, index);
  });
  const result = new Array<string>(keys.length).fill('unknown'); // fill with not found error ???
  await pMap(idsByQueue.keys(), async (queue) => {
    const metas = idsByQueue.get(queue);
    const ids = Array.from(metas.keys());
    const states = await Scripts.multiGetJobState(queue, ids);
    states.forEach((state, i) => {
      const index = metas.get(ids[i]);
      result[index] = state;
    });
  });

  return result;
};

export const jobState = new DataLoader(batchGetJobStateById, {
  cacheKeyFn: jobLocatorCacheFn,
});
