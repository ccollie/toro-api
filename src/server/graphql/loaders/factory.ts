import registerJobById from './job-by-id';
import registerJobCounts from './job-counts';
import registerJobState from './job-state';
import registerQueuePaused from './queue-paused';
import registerQueueWorkers from './queue-workers';
import registerQueueAlertCount from './queue-alert-count';
import registerJobMemoryUsage from './job-memory';
import { LoaderCtor, LoaderMetaData } from './types';

const loaderMetaRegistry = new Map<string, LoaderMetaData>();

function registerFn(
  key: string,
  ctor: LoaderCtor,
  dependencies?: string[],
): void {
  const meta: LoaderMetaData = {
    key,
    ctor,
    dependencies: dependencies ?? [],
  };
  loaderMetaRegistry.set(key, meta);
}

let initialized = false;

export function initialize(): void {
  if (initialized) return;
  initialized = true;
  registerJobById(registerFn);
  registerJobCounts(registerFn);
  registerJobState(registerFn);
  registerQueueWorkers(registerFn);
  registerQueueAlertCount(registerFn);
  registerQueuePaused(registerFn);
  registerJobMemoryUsage(registerFn);
}

export function getLoaderMeta(key: string): LoaderMetaData {
  if (!initialized) initialize();
  return loaderMetaRegistry.get(key);
}

export function getLoaderKeys(): string[] {
  initialize();
  return Array.from(loaderMetaRegistry.keys());
}
