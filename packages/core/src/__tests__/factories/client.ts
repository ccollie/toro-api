//import { ensureScriptsLoaded } from '../../commands';
import { ConnectionOptions } from '../../redis';
import { RedisClient } from 'bullmq';
import IORedis from 'ioredis';

export const TEST_DB = 13;
export const TEST_QUEUE_PREFIX = 'test';

export const DEFAULT_CONNECTION_OPTIONS: ConnectionOptions = {
  db: TEST_DB,
  lazyConnect: false,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export async function createClient(
  options?: ConnectionOptions | string,
  withScripts = true,
): Promise<RedisClient> {
  options = options || DEFAULT_CONNECTION_OPTIONS;
  let client;

  if (!options) {
    client = new IORedis(); // supported in 4.19.0
  } else if (typeof options === 'string') {
    client = new IORedis(options as string);
  } else {
    client = new IORedis(options);
  }
  // if (withScripts) await ensureScriptsLoaded(client);
  return client;
}

export async function clearDb(client?: RedisClient): Promise<void> {
  const flushClient = client || (await createClient(null, false));
  await flushClient.flushdb();
  if (!client) {
    flushClient.disconnect();
  }
}
