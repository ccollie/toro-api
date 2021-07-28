import { createClient as _createClient } from '../../src/redis/utils';
import { ConnectionOptions } from '../../src/redis';
import { RedisClient } from 'bullmq';
import { loadScripts } from '../../src/commands/utils';

export const TEST_DB = 13;
export const TEST_QUEUE_PREFIX = 'test';

export const DEFAULT_CONNECTION_OPTIONS: ConnectionOptions = {
  db: TEST_DB,
  lazyConnect: false,
};

export async function createClient(
  options?: ConnectionOptions,
): Promise<RedisClient> {
  options = options || DEFAULT_CONNECTION_OPTIONS;
  const client = _createClient(options);
  await loadScripts(client);
  return client;
}

export async function clearDb(client?: RedisClient): Promise<void> {
  const flushClient = client || (await createClient());
  await flushClient.flushdb();
  if (!client) {
    flushClient.disconnect();
  }
}
