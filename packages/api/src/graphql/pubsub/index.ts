import { logger } from '@alpen/core';
import { isPromise } from '@alpen/shared';
import { InMemoryPubSub, PubSubEngine } from 'graphql-ez/pubsub';
import { createSharedSubscriptionResolver } from './subscriptionManager';

// In a production server you might want to have some message broker or pubsub implementation like
// rabbitMQ, redis or kafka logic here
// you can use one of the graphql subscription implementations to do it easily
//
// Redis: https://github.com/davidyaha/graphql-redis-subscriptions
// Kafka: https://github.com/ancashoria/graphql-kafka-subscriptions
// Rabbitmq: https://github.com/cdmbase/graphql-rabbitmq-subscriptions

function createPubsub(): PubSubEngine {
  // const redisPubsubUrl = getValue('redis_pubsub_url');
  // if (redisPubsubUrl) return createRedisPubSubEngine(redisPubsubUrl);
  return new InMemoryPubSub();
}

const pubsub: PubSubEngine = createPubsub();

export function publish(
  channelName: string,
  payload?: Record<string, any>,
): void {
  const res = pubsub.publish(channelName, payload);
  if (isPromise(res)) {
    res.catch((err) => {
      logger.warn(err);
    });
  }
}

export { createSharedSubscriptionResolver };
export { PubSubEngine, pubsub };
