import { HostConfig } from '../../src/types';
import { DEFAULT_CONNECTION_OPTIONS } from './client';
import { getUniqueId } from '../../src/server/lib';
import { HostManager } from '../../src/server/hosts';

function createConfig(defaults?: Partial<HostConfig>): HostConfig {
  return {
    allowDynamicQueues: false,
    autoDiscoverQueues: false,
    connection: DEFAULT_CONNECTION_OPTIONS,
    queues: [],
    channels: [],
    id: getUniqueId(),
    name: 'host-' + getUniqueId(),
    ...(defaults || {}),
  };
}

export function createHostManager(config?: Partial<HostConfig>): HostManager {
  process.env.HOST_URI_TEMPLATE =
    '{{server.host}}:{{server.port}}/hosts/{{host.id}}';
  const hostConfig = createConfig(config);
  return new HostManager(hostConfig);
}
