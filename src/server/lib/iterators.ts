// https://github.com/graphql-compose/graphql-compose-bullmq
import { isPromise } from './index';
import { debounce } from './index';
import Emittery from 'emittery';
import EventEmitter = NodeJS.EventEmitter;

export interface IteratorBatchOptions<
  TEvent = any,
  TTransformed = TEvent,
  TOutput = TTransformed
> {
  /***
   * The batch interval in milliseconds
   */
  interval: number;
  /***
   * Transfers a batch into a final output
   * @param batch
   */
  transformer: (batch: TTransformed[]) => TOutput;
}

export interface IteratorOptions<TEvent, TTransformed, TOutput> {
  eventNames: string | string[];
  filter?: (eventName: string, value?: TEvent) => boolean;
  transform?: (
    eventName: string,
    value?: TEvent,
  ) => TTransformed | Promise<TTransformed>;
  batch?: IteratorBatchOptions<TEvent, TTransformed, TOutput>;
}

export function createAsyncIterator<
  TEvent = any,
  TTransformed = TEvent,
  TOutput = TTransformed
>(
  emitter: Emittery | EventEmitter,
  options: IteratorOptions<TEvent, TTransformed, TOutput>,
): Required<AsyncIterator<TOutput>> {
  let pullSeries: any = [];
  let pushSeries: any = [];
  let listening = true;

  const eventNames = Array.isArray(options.eventNames)
    ? options.eventNames
    : [options.eventNames];

  const filter = options.filter || (() => true);
  const transform = options.transform || ((_, value) => value);
  const isBatching = options.batch && options.batch.interval;
  const batchTransformer =
    (isBatching && options.batch.transformer) || ((value) => value);

  const pushValue = (event): void => {
    if (event === undefined) return;
    if (pullSeries.length !== 0) {
      const resolver = pullSeries.shift();
      resolver({ value: event, done: false });
    } else {
      pushSeries.push(event);
    }
  };

  const pullValue = () => {
    return new Promise((resolve) => {
      if (pushSeries.length !== 0) {
        const value = pushSeries.shift();
        resolve({ value, done: false });
      } else {
        pullSeries.push(resolve);
      }
    });
  };

  let pushFn = pushValue;
  if (isBatching) {
    const batchedPush = (args: TTransformed[]): void => {
      if (listening) {
        const batched = batchTransformer(args);
        pushValue(batched);
      }
    };

    pushFn = debounce(batchedPush, options.batch.interval);
  }

  const handler = (name: string, event?: TEvent): void => {
    if (filter(name, event)) {
      const transformed = transform(name, event);
      if (isPromise(transformed)) {
        (transformed as any).then(pushFn);
        // todo: how to handle rejections ?
      } else {
        pushFn(transformed);
      }
    }
  };

  const unsubscribers = [];
  eventNames.forEach((name) => {
    const listener = (event) => handler(name, event as TEvent);
    emitter.on(name, listener);
    unsubscribers.push(() => emitter.off(name, listener));
  });

  function release(): void {
    if (listening) {
      listening = false;
      unsubscribers.forEach((fn) => fn());
      for (const resolve of pullSeries) {
        resolve({ value: undefined, done: true });
      }
      pullSeries = [];
      pushSeries = [];
    }
  }

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    return() {
      release();
      return Promise.resolve({ value: undefined, done: true });
    },
    next() {
      return listening ? pullValue() : this.return();
    },
    throw(error) {
      release();
      return Promise.reject(error);
    },
  } as Required<AsyncIterator<TOutput>>;
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

    if (isPromise(val)) {
      return (val as any).finally(() => savedReturn());
    }

    return savedReturn();
  };

  return asyncIterator;
}
