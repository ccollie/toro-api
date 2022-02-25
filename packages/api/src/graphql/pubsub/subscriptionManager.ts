import { isNil, isString, isPromise } from '@alpen/shared';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { RefCountCache, withCancel, withFilter } from '@alpen/core';
import { EZContext } from 'graphql-ez';

declare module 'graphql-ez' {
  interface EZContext {
    channelName: string;
  }
}

export type ChannelNameFn = (
  rootValue: unknown,
  args: unknown,
  context: EZContext,
  info: any,
) => string;

export type SubscribeFn = (
  rootValue: unknown,
  args: unknown,
  context: EZContext,
  info: GraphQLResolveInfo,
) => void | AsyncIterator<any> | Promise<void | AsyncIterator<any>>;

const defaultChannelNameFn = (_, args) => args.event;

const defaultCreateSubscription: SubscribeFn = (_, args, context) =>
  context.pubsub.subscribe(context.channelName || (args as any).event);

export type UnsubscribeFn = (
  rootValue: unknown,
  args: unknown,
  context: EZContext,
  info: GraphQLResolveInfo,
) => void;

export interface SubscriptionCreationOptions<T = any> {
  filter?: (data: T) => boolean;
  channelName?: string | ChannelNameFn;
  /**
   * Creates an iterator if one does not already exist for `channelName`
   */
  onSubscribe?: SubscribeFn;
  onUnsubscribe?: UnsubscribeFn;
}

const iteratorCache = new RefCountCache<AsyncIterator<any>>();

/**
 * Creates a subscription resolver that returns a possibly shared iterator, which is
 * referenced counted and cleaned up after no further subscriptions use it
 * @param options
 */
export function createSharedSubscriptionResolver<TData = any>(
  options: SubscriptionCreationOptions<TData> = {
    channelName: defaultChannelNameFn,
    onSubscribe: defaultCreateSubscription,
  },
): GraphQLFieldResolver<any, any> {
  return async (
    rootValue: unknown,
    args: unknown,
    context: EZContext,
    info: GraphQLResolveInfo,
  ): Promise<any> => {
    const channelName = isString(options.channelName)
      ? options.channelName
      : options.channelName(rootValue, args, context, info);

    async function createIterator(): Promise<AsyncIterator<TData>> {
      const _context = { ...context, channelName };
      let initValue = options.onSubscribe(rootValue, args, _context, info);

      let iterator;

      if (isPromise(initValue)) {
        initValue = await initValue;
      }

      if (isNil(initValue)) {
        iterator = context.pubsub.subscribe(channelName);
      } else {
        // asyncIterator
        iterator = initValue as AsyncIterator<TData>;
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
      iterator = withFilter(iterator, options.filter);
    }

    return iterator;
  };
}
