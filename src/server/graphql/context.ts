import config from '../config';
import { Supervisor } from '../supervisor';
import { PackageInfo, packageInfo } from '../packageInfo';
import { parseBool } from '../lib';
import { publish, pubsub, PubSubEngine } from './pubsub';

const env = config.get('env');
const debug = parseBool(process.env.DEBUG) && env !== 'production';

export interface ExecutionContext {
  env: string;
  supervisor: Supervisor;
  packageInfo: PackageInfo;
  pubsub: PubSubEngine;
  debug: boolean;
  publish: (channelName: string, payload?: Record<string, any>) => void;
}

export type ContextFactory = () => ExecutionContext;

export function createContext(): ExecutionContext {
  const supervisor = Supervisor.getInstance();
  return {
    env,
    supervisor,
    packageInfo,
    publish,
    pubsub,
    debug,
  };
}
