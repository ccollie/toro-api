// based on https://github.com/graphql-compose/graphql-compose-bullmq
import { isPromise } from './index';
import { debounce } from './index';
import Emittery from 'emittery';
import EventEmitter = NodeJS.EventEmitter;
import Denque from 'denque';

export function makeAsyncIterator<T>(properties: Record<string, any>) {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      return this;
    },
    ...properties,
  };
}

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
   * Transforms a batch into a final output
   * @param batch
   */
  transformer: (batch: TTransformed[]) => TOutput;
}

export interface IteratorOptions<
  TEvent,
  TTransformed = TEvent,
  TOutput = TTransformed
> {
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
  const eventNames = Array.isArray(options.eventNames)
    ? options.eventNames
    : [options.eventNames];

  // Emittery's events() method implements AsyncIterator, so if we're not
  // filtering or buffering use its implementation
  if (emitter instanceof Emittery) {
    if (!options.filter && !options.batch && !options.transform) {
      return emitter.events(eventNames) as Required<AsyncIterator<TOutput>>;
    }
  }

  const filter = options.filter || (() => true);
  const transform = options.transform || ((_, value) => value);
  const isBatching = options.batch?.interval;
  const batchTransformer =
    (isBatching && options.batch.transformer) || ((value) => value);

  // since iterators can be long-lived, we minimize
  // allocations by using a dequeue instead of arrays
  const pullSeries = new Denque();
  const pushSeries = new Denque();

  let listening = true;

  const pushValue = (event): void => {
    if (event === undefined) return;
    if (!pullSeries.isEmpty()) {
      const resolver = pullSeries.shift();
      resolver({ value: event, done: false });
    } else {
      pushSeries.push(event);
    }
  };

  const pullValue = () => {
    return new Promise((resolve) => {
      if (!pushSeries.isEmpty()) {
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
      let resolve;
      while ((resolve = pullSeries.pop()) !== undefined) {
        resolve({ value: undefined, done: true });
      }
      pushSeries.clear();
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

export type IteratorCancelCallback = () => void | Promise<void>;
// eslint-disable-next-line @typescript-eslint/ban-types
const iteratorDestructors = new WeakMap<object, IteratorCancelCallback[]>();

// to handle unsubscribe https://github.com/apollographql/graphql-subscriptions/issues/99
// https://stackoverflow.com/questions/56886412/detect-an-unsubscribe-in-apollo-graphql-server
export function withCancel<T>(
  asyncIterator: AsyncIterator<T | undefined>,
  onCancel: IteratorCancelCallback,
): AsyncIterator<T | undefined> {
  if (!asyncIterator.return) {
    asyncIterator.return = () =>
      Promise.resolve({ value: undefined, done: true });
  }

  let dtors = iteratorDestructors.get(asyncIterator);
  if (!dtors?.length) {
    dtors = [];
    iteratorDestructors.set(asyncIterator, dtors);

    const savedReturn = asyncIterator.return.bind(asyncIterator);
    asyncIterator.return = () => {
      const dtors = iteratorDestructors.get(asyncIterator);
      if (dtors) {
        iteratorDestructors.delete(asyncIterator);
        const calls = dtors.map((dtor) => dtor());
        return Promise.all(calls).finally(savedReturn);
      }

      return savedReturn();
    };
  }
  dtors.push(onCancel);

  return asyncIterator;
}
