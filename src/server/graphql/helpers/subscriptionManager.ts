import { isNil, isString } from 'lodash';
import { PubSub, FilterFn } from 'apollo-server-express';
import { GraphQLFieldResolver } from 'graphql';
import { logger, withCancel } from '../../lib';

// In a production server you might want to have some message broker or pubsub implementation like
// rabbitMQ, redis or kafka logic here
// you can use one of the graphql subscription implementations to do it easily
//
// Redis: https://github.com/davidyaha/graphql-redis-subscriptions
// Kafka: https://github.com/ancashoria/graphql-kafka-subscriptions
// Rabbitmq: https://github.com/cdmbase/graphql-rabbitmq-subscriptions

export const pubsub = new PubSub(); // todo: move this out

export type ChannelNameFn = (
  rootValue: any,
  args: any,
  context: any,
  info: any,
) => string;

export type SubscribeFn = (
  rootValue: any,
  args: any,
  context: any,
  info: any,
) => void | AsyncIterator<any> | Promise<void | AsyncIterator<any>>;

const defaultChannelNameFn = (_, args) => args.event;

const defaultCreateSubscription: SubscribeFn = (_, args, context) =>
  pubsub.asyncIterator(context.channelName || args.event);

export type UnsubscribeFn = (
  rootValue: any,
  args: any,
  context: any,
  info: any,
) => void;

export interface SubscriptionCreationOptions {
  filter?: FilterFn;
  channelName?: string | ChannelNameFn;
  onSubscribe?: SubscribeFn;
  onUnsubscribe?: UnsubscribeFn;
}

export function publish(
  channelName: string,
  payload?: Record<string, any>,
): void {
  pubsub.publish(channelName, payload).catch((err) => {
    logger.warn(err);
  });
}

function createFilteredIterator(
  asyncIterator: AsyncIterator<any>,
  filterFn: FilterFn,
  args: any,
  context: any,
  info: any,
): AsyncIterator<any> {
  const getNextPromise = () => {
    return asyncIterator
      .next()
      .then((payload) =>
        Promise.all([
          payload,
          Promise.resolve(filterFn(payload.value, args, context, info)).catch(
            (err) => {
              logger.warn(err);
              return false;
            },
          ),
        ]),
      )
      .then(([payload, filterResult]) => {
        if (filterResult === true || payload.done === true) {
          return payload;
        }

        // Skip the current value and wait for the next one
        return getNextPromise();
      });
  };

  return {
    next() {
      return getNextPromise();
    },
    return() {
      return asyncIterator.return();
    },
    throw(error) {
      return asyncIterator.throw(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  } as any;
}

const iteratorCache = new Map<string, AsyncIterator<any>>();

export function createSubscriptionResolver(
  options: SubscriptionCreationOptions = {
    channelName: defaultChannelNameFn,
    onSubscribe: defaultCreateSubscription,
  },
): GraphQLFieldResolver<any, any> {
  return async (
    rootValue: any,
    args: any,
    context: any,
    info: any,
  ): Promise<any> => {
    const channelName = isString(options.channelName)
      ? options.channelName
      : options.channelName(rootValue, args, context, info);

    function createIterator(): AsyncIterator<any> {
      const _context = { ...context, channelName };
      const initValue = options.onSubscribe(rootValue, args, _context, info);

      let iterator;

      if (isNil(initValue)) {
        iterator = pubsub.asyncIterator(channelName);
      } else {
        // asyncIterator
        iterator = initValue as AsyncIterator<any>;
      }

      if (options.onUnsubscribe) {
        const dtor = () =>
          options.onUnsubscribe(rootValue, args, _context, info);
        iterator = withCancel(iterator, dtor);
      }

      withCancel(iterator, () => {
        iteratorCache.delete(channelName);
      });

      return iterator;
    }

    let iterator = iteratorCache.get(channelName);
    if (!iterator) {
      iterator = createIterator();
      iteratorCache.set(channelName, iterator);
    }

    if (options.filter) {
      iterator = createFilteredIterator(
        iterator,
        options.filter,
        args,
        context,
        info,
      );
    }

    return iterator;
  };
}
