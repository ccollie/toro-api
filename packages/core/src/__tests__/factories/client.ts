//import { ensureScriptsLoaded } from '../../commands';
import { RedisClient, ConnectionOptions, isRedisInstance } from 'bullmq';
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
  let client;

  if (typeof options === 'string') {
    client = new IORedis(options as string);
  } else if (isRedisInstance(options)) {
    client = <RedisClient>options;
  } else {
    client = new IORedis({
      db: TEST_DB,
      lazyConnect: false,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  // if (withScripts) await ensureScriptsLoaded(client);
  return client;
}

export async function clearDb(client?: RedisClient): Promise<void> {
  const flushClient = client || (await createClient());
  await flushClient.flushdb();
  if (!client) {
    flushClient.disconnect();
  }
}
