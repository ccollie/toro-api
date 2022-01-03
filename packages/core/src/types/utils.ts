
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

export type ValueOf<T> = T[keyof T];
