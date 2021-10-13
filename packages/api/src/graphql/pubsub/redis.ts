import { PubSubEngine } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { RedisClient } from 'bullmq';
import { isNil, isString } from 'lodash';
import IORedis, { RedisOptions } from 'ioredis';

export type ConnectionOptions = string | RedisOptions;

function createClient(redisOpts?: ConnectionOptions): RedisClient {
  let client;
  if (isNil(redisOpts)) {
    client = new IORedis(); // supported in 4.19.0
  } else if (isString(redisOpts)) {
    client = new IORedis(redisOpts as string);
  } else {
    client = new IORedis(redisOpts);
  }
  return client;
}

export function createRedisPubSubEngine(redisUrl: string): PubSubEngine {
  return new RedisPubSub({
    publisher: createClient(redisUrl),
    subscriber: createClient(redisUrl),
  });
}
