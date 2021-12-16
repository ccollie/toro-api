import { RedisClient, scriptLoader } from 'bullmq';

export async function ensureScriptsLoaded(
  client: RedisClient,
): Promise<RedisClient> {
  await scriptLoader.load(client, __dirname);
  return client;
}
