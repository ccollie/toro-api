import config from '../config';
import { Supervisor } from '../supervisor';
import { PackageInfo, packageInfo } from '../packageInfo';
import { parseBool } from '../lib';
import { publish, pubsub, PubSubEngine } from './pubsub';
import { DataLoaderRegistry } from '../graphql/loaders';

const env = config.get('env');
const debug = parseBool(process.env.DEBUG) && env !== 'production';

export interface ResolverContext {
  env: string;
  loaders: DataLoaderRegistry;
  supervisor: Supervisor;
  packageInfo: PackageInfo;
  pubsub: PubSubEngine;
  debug: boolean;
  publish: (channelName: string, payload?: Record<string, any>) => void;
}

export type ContextFactory = () => ResolverContext;

export function createContext(): ResolverContext {
  const supervisor = Supervisor.getInstance();
  const loaders = new DataLoaderRegistry();
  return {
    env,
    loaders,
    supervisor,
    packageInfo,
    publish,
    pubsub,
    debug,
  };
}
