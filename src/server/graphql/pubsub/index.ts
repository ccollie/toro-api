import { getValue } from '../../config';
import { PubSub, FilterFn, PubSubEngine } from 'graphql-subscriptions';
import { logger } from '@lib/index';
import { createRedisPubSubEngine } from './redis';

// In a production server you might want to have some message broker or pubsub implementation like
// rabbitMQ, redis or kafka logic here
// you can use one of the graphql subscription implementations to do it easily
//
// Redis: https://github.com/davidyaha/graphql-redis-subscriptions
// Kafka: https://github.com/ancashoria/graphql-kafka-subscriptions
// Rabbitmq: https://github.com/cdmbase/graphql-rabbitmq-subscriptions

function createPubsub(): PubSubEngine {
  const redisPubsubUrl = getValue('redis_pubsub_url');
  if (redisPubsubUrl) return createRedisPubSubEngine(redisPubsubUrl);
  return new PubSub();
}

const pubsub: PubSubEngine = createPubsub();

export function publish(
  channelName: string,
  payload?: Record<string, any>,
): void {
  pubsub.publish(channelName, payload).catch((err) => {
    logger.warn(err);
  });
}

export { PubSubEngine, FilterFn, pubsub };
