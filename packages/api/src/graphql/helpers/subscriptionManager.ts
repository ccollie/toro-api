import { isNil, isString } from 'lodash';
import { GraphQLFieldResolver } from 'graphql';
import { pubsub, FilterFn } from '../pubsub';
import { RefCountCache, logger, withCancel } from '@alpen/core';
import { isPromise } from '@alpen/shared';
import { EZContext } from 'graphql-ez';

declare module 'graphql-ez' {
  interface EZContext {
    channelName: string;
  }
}

export type ChannelNameFn = (
  rootValue: any,
  args: any,
  context: EZContext,
  info: any,
) => string;

export type SubscribeFn = (
  rootValue: any,
  args: any,
  context: EZContext,
  info: any,
) => void | AsyncIterator<any> | Promise<void | AsyncIterator<any>>;

const defaultChannelNameFn = (_, args) => args.event;

const defaultCreateSubscription: SubscribeFn = (_, args, context) =>
  pubsub.asyncIterator(context.channelName || args.event);

export type UnsubscribeFn = (
  rootValue: any,
  args: any,
  context: EZContext,
  info: any,
) => void;

export interface SubscriptionCreationOptions {
  filter?: FilterFn;
  channelName?: string | ChannelNameFn;
  onSubscribe?: SubscribeFn;
  onUnsubscribe?: UnsubscribeFn;
}

function createFilteredIterator(
  asyncIterator: AsyncIterator<any>,
  filterFn: FilterFn,
  args: any,
  context: EZContext,
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

const iteratorCache = new RefCountCache<AsyncIterator<any>>();

export function createSubscriptionResolver(
  options: SubscriptionCreationOptions = {
    channelName: defaultChannelNameFn,
    onSubscribe: defaultCreateSubscription,
  },
): GraphQLFieldResolver<any, any> {
  return async (
    rootValue: any,
    args: any,
    context: EZContext,
    info: any,
  ): Promise<any> => {
    const channelName = isString(options.channelName)
      ? options.channelName
      : options.channelName(rootValue, args, context, info);

    async function createIterator(): Promise<AsyncIterator<any>> {
      const _context = { ...context, channelName };
      let initValue = options.onSubscribe(rootValue, args, _context, info);

      let iterator;

      if (isPromise(initValue)) {
        initValue = await initValue;
      }

      if (isNil(initValue)) {
        iterator = pubsub.asyncIterator(channelName);
      } else {
        // asyncIterator
        iterator = initValue as AsyncIterator<any>;
      }

      withCancel(iterator, () => {
        iteratorCache.removeReference(channelName);
      });

      return iterator;
    }

    let iterator = iteratorCache.getRef(channelName);
    if (!iterator) {
      iterator = await createIterator();
      iteratorCache.addEntry(channelName, iterator);
    }

    if (options.onUnsubscribe) {
      const _context = { ...context, channelName };
      const dtor = () => options.onUnsubscribe(rootValue, args, _context, info);
      iterator = withCancel(iterator, dtor);
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
