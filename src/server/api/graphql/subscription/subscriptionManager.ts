import { isNil, isString } from 'lodash';
import { PubSub, FilterFn } from 'apollo-server-express';
import { GraphQLFieldResolver } from 'graphql';

// In a production server you might want to have some message broker or pubsub implementation like
// rabbitMQ, redis or kafka logic here
// you can use one of the graphql subscription implementations to do it easily
//
// Redis: https://github.com/davidyaha/graphql-redis-subscriptions
// Kafka: https://github.com/ancashoria/graphql-kafka-subscriptions
// Rabbitmq: https://github.com/cdmbase/graphql-rabbitmq-subscriptions

export const pubsub = new PubSub();

class IteratorMetadata {
  public refCount: number;
  public iterator: AsyncIterator<any>;
  public onDestroy: Function;

  constructor(iterator: AsyncIterator<any>, onDestroy: Function = null) {
    this.iterator = iterator;
    this.refCount = 0;
    this.onDestroy = onDestroy;
  }

  async destroy(): Promise<void> {
    if (this.onDestroy) {
      try {
        await this.onDestroy();
      } catch (e) {
        console.log(e);
      }
    }
  }

  addRef(): number {
    return ++this.refCount;
  }

  unref(): number {
    return --this.refCount;
  }
}

export const subscriptionMap = new Map<string, IteratorMetadata>();

export type ChannelNameFn = (
  rootValue: any,
  args: any,
  context: any,
  info: any,
) => string | Promise<string>;

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
) => void | Promise<void>;

export interface SubscriptionCreationOptions {
  filter?: FilterFn;
  channelName?: string | ChannelNameFn;
  onSubscribe?: SubscribeFn;
  onUnsubscribe?: UnsubscribeFn;
}

// to handle unsubscribe https://github.com/apollographql/graphql-subscriptions/issues/99
// https://stackoverflow.com/questions/56886412/detect-an-unsubscribe-in-apollo-graphql-server
export function withCancel<T>(
  asyncIterator: AsyncIterator<T | undefined>,
  onCancel: () => void | Promise<void>,
): AsyncIterator<T | undefined> {
  if (!asyncIterator.return) {
    asyncIterator.return = () =>
      Promise.resolve({ value: undefined, done: true });
  }

  const savedReturn = asyncIterator.return.bind(asyncIterator);
  asyncIterator.return = () => {
    const val = onCancel() as any;

    if (val && val.then && typeof val.then === 'function') {
      return (val as any).finally(() => savedReturn());
    }

    return savedReturn();
  };

  return asyncIterator;
}

export function publish(eventName: string, payload?: any): Promise<void> {
  return pubsub.publish(eventName, payload);
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
            () => false,
          ),
        ]),
      )
      .then(([payload, filterResult]) => {
        if (filterResult === true) {
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

export function createResolver(
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
    let iterator;

    const channelName = isString(options.channelName)
      ? options.channelName
      : await options.channelName(rootValue, args, context, info);

    let meta = subscriptionMap.get(channelName);

    function handleUnsubscribe(): any {
      if (meta && meta.unref() === 0) {
        subscriptionMap.delete(channelName);
        return meta.destroy();
      }
    }

    const _context = { ...context, channelName };

    if (!meta) {
      const initValue = await options.onSubscribe(
        rootValue,
        args,
        _context,
        info,
      );

      if (isNil(initValue)) {
        iterator = pubsub.asyncIterator(channelName);
      } else {
        // asyncIterator
        iterator = initValue as AsyncIterator<any>;
      }
      if (!iterator.return) {
        iterator.return = Promise.resolve({ value: undefined, done: true });
      }

      const savedReturn = iterator.return.bind(iterator);
      iterator.return = async () => {
        try {
          await handleUnsubscribe();
        } catch {}
        return savedReturn();
      };

      const dtor = options.onUnsubscribe
        ? () => options.onUnsubscribe(rootValue, args, _context, info)
        : null;
      meta = new IteratorMetadata(iterator, dtor);
    }

    meta.addRef();

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
