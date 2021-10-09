import { jobState } from './job-state';
import DataLoader from 'dataloader';
import { jobLocatorCacheFn } from './utils';
import type { JobInStateLoaderKey } from './types';

function cacheKeyFn(key: JobInStateLoaderKey): string {
  const specPart = jobLocatorCacheFn(key.job);
  const states = key.states.sort().join(',');
  return `${specPart}:${states}`;
}

async function fetch(keys: JobInStateLoaderKey[]): Promise<boolean[]> {
  const stateKeys = keys.map((x) => x.job);
  const states = (await jobState.loadMany(stateKeys)) as Array<string | Error>;
  return keys.map((key, index) => {
    const state = states[index];
    // ignore errors for now
    if (state instanceof Error) return false;
    return key.states.includes(state);
  });
}

export const jobInState = new DataLoader(fetch, {
  cacheKeyFn,
});
