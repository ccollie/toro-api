import DataLoader from 'dataloader';
import { Queue } from 'bullmq';
import { Scripts } from '@server/commands/scripts';
import pMap from 'p-map';
import { ensureQueue, getJobIdSpec, jobLocatorCacheFn } from './utils';
import { JobLocator, RegisterFn } from './types';

export type JobInStateLoaderKey = {
  job: JobLocator;
  states: string[];
};

function jobInStateCacheFn(key: JobInStateLoaderKey): string {
  const specPart = jobLocatorCacheFn(key.job);
  const states = key.states.sort().join(',');
  return `${specPart}:${states}`;
}

const batchGetJobStateById = async (keys: JobLocator[]) => {
  const idsByQueue = new Map<Queue, Map<string, number>>();
  keys.forEach((key, index) => {
    const { queue, id } = getJobIdSpec(key);
    const _q = ensureQueue(queue);
    let ids = idsByQueue.get(_q);
    if (!ids) {
      ids = new Map<string, number>();
      idsByQueue.set(_q, ids);
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

export default function registerLoaders(register: RegisterFn): void {
  const options = {
    cacheKeyFn: jobLocatorCacheFn,
  };

  const jobStateByIdCtor = () => new DataLoader(batchGetJobStateById, options);

  const checkJobInStateCtor = (jobStateById) => {
    async function jobInState(keys: JobInStateLoaderKey[]): Promise<boolean[]> {
      const stateKeys = keys.map((x) => x.job);
      const states = (await jobStateById.loadMany(stateKeys)) as Array<
        string | Error
      >;
      return keys.map((key, index) => {
        const state = states[index];
        // ignore errors for now
        if (state instanceof Error) return false;
        return key.states.includes(state);
      });
    }

    return new DataLoader(jobInState, {
      cacheKeyFn: jobInStateCacheFn,
    });
  };

  register('jobState', jobStateByIdCtor);
  register('checkJobInState', checkJobInStateCtor, ['jobState']);
}
