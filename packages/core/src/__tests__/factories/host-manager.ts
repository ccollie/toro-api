import { HostConfig, HostManager } from '../../hosts';
import { DEFAULT_CONNECTION_OPTIONS, TEST_DB } from './client';
import { getUniqueId } from '../../ids';

function createConfig(defaults?: Partial<HostConfig>): HostConfig {
  return {
    allowDynamicQueues: false,
    autoDiscoverQueues: false,
    connection: {
      ...DEFAULT_CONNECTION_OPTIONS,
      db: TEST_DB,
    },
    queues: [],
    channels: [],
    id: getUniqueId(),
    name: 'host-' + getUniqueId(),
    ...(defaults || {}),
  };
}

export async function createHostManager(config?: Partial<HostConfig>): Promise<HostManager> {
  process.env.HOST_URI_TEMPLATE =
    '{{server.host}}:{{server.port}}/hosts/{{host.id}}';
  const hostConfig = createConfig(config);
  const host = new HostManager(hostConfig);
  await host.waitUntilReady();
  return host;
}