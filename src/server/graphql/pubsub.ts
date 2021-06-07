// todo: explicitly reference graphql-subscriptions instead of apollo
import { PubSub, FilterFn, PubSubEngine } from 'apollo-server-express';
import { logger } from '../lib';

// In a production server you might want to have some message broker or pubsub implementation like
// rabbitMQ, redis or kafka logic here
// you can use one of the graphql subscription implementations to do it easily
//
// Redis: https://github.com/davidyaha/graphql-redis-subscriptions
// Kafka: https://github.com/ancashoria/graphql-kafka-subscriptions
// Rabbitmq: https://github.com/cdmbase/graphql-rabbitmq-subscriptions

export const pubsub = new PubSub(); // todo: construct based on config

export { PubSubEngine, FilterFn };

export function publish(
  channelName: string,
  payload?: Record<string, any>,
): void {
  pubsub.publish(channelName, payload).catch((err) => {
    logger.warn(err);
  });
}
