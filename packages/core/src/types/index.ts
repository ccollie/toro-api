export * from './app-info';
export * from './notifications';
export * from './timespan';
export * from './queues';
export * from './queue-filters';
export * from './rules';
export * from './rule-conditions';

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
