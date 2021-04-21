import { createClient as _createClient } from '../../src/server/redis/utils';
import * as IORedis from 'ioredis';
import { ConnectionOptions } from '../../src/types';
import { loadScripts } from '../../src/server/commands';

export const TEST_DB = 13;
export const DEFAULT_CLIENT_OPTIONS: ConnectionOptions = {
  db: TEST_DB,
  lazyConnect: false,
};

export async function createClient(
  options?: ConnectionOptions,
): Promise<IORedis.Redis> {
  options = options || DEFAULT_CLIENT_OPTIONS;
  const client = _createClient(options);
  await loadScripts(client);
  return client;
}

export async function clearDb(client?: IORedis.Redis) {
  const flushClient = client || (await createClient());
  await flushClient.flushdb();
  if (!client) {
    flushClient.disconnect();
  }
}
