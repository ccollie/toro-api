import { Supervisor } from '../supervisor';
import { publish, pubsub, PubSubEngine } from './index';
import { DataLoaderRegistry } from './loaders';
import { ExecutionContext, Request } from 'graphql-helix';

export interface Context {
  loaders: DataLoaderRegistry;
  supervisor: Supervisor;
  pubsub: PubSubEngine;
  publish: (channelName: string, payload?: Record<string, any>) => void;
  request?: Request;
  [k: string]: any;
}

export type ContextFunction = (...args: any[]) => Context | Promise<Context>;

export function createContext(executionContext: ExecutionContext): Context {
  const supervisor = Supervisor.getInstance();
  const { request } = executionContext;
  let loaders: DataLoaderRegistry; // make this lazy ??
  return {
    supervisor,
    publish,
    pubsub,
    request,
    get loaders(): DataLoaderRegistry {
      return loaders || (loaders = new DataLoaderRegistry());
    },
  };
}
