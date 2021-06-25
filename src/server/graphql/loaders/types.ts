import DataLoader from 'dataloader';
import { Job } from 'bullmq';
import { JobIdSpec } from '@src/types';

export type LoaderCtor<K = any, V = any, C = K> = (
  ...dependencies: DataLoader<any, any>[]
) => DataLoader<K, V, C>;

export type JobLocator = Job | JobIdSpec;

export type RegisterFn = (
  key: string,
  ctor: LoaderCtor,
  dependencies?: string[],
) => void;

export interface LoaderMetaData {
  key: string;
  ctor: LoaderCtor;
  dependencies: string[];
}
