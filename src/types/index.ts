export * from './app-info';
export * from './config';
export * from './jobs';
export * from './mail';
export * from './metrics';
export * from './notifications';
export * from './queue';
export * from './queue-worker';
export * from './repeatable-job';
export * from './redis-metrics';
export * from './rules';
export * from './stats';
export * from './timespan';

export interface Constructor<T> {
  new (...args: any[]): T;
}

// Generic predicate
export interface Predicate<T = any> {
  (...args: T[]): boolean;
}

export type Maybe<T> = T | null;

export type KeyValuePair<K = string, V = any> = {
  key: K;
  value: V;
};
