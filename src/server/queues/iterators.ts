// https://github.com/graphql-compose/graphql-compose-bullmq
import { QueueListener } from './queueListener';
import { isPromise } from '../lib';

const NullFilter = (eventName: string, value: any) => true;
const NullTransformer = (eventName: string, value: any) => value;

export function createAsyncIterator<T = any>(
  queueEvents: QueueListener,
  eventNames: string | string[],
  filter: (eventName: string, value?: T) => boolean = NullFilter,
  transform: (eventName, value?: T) => any = NullTransformer,
): Required<AsyncIterator<T>> {
  let pullSeries: any = [];
  let pushSeries: any = [];
  let listening = true;

  if (!Array.isArray(eventNames)) {
    eventNames = [eventNames];
  }

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

  const handler = (name: string, event?: T) => {
    if (filter(name, event)) {
      const transformed = transform(name, event);
      // handle promise, if necessary
      if (isPromise(transformed)) {
        transformed.then(pushValue);
        // todo: how to handle rejections ?
      } else {
        pushValue(transformed);
      }
    }
  };

  const unsubscribers = eventNames.map((name) =>
    queueEvents.on(name, (event) => handler(name, event as T)),
  );

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
  } as Required<AsyncIterator<T>>;
}
