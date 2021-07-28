// https://github.com/zenparsing/async-iteration-buffer
import Denque from 'denque';

export type CancelFn = () => void | Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const NullCancelFn: CancelFn = () => {};

// todo: filter
export interface AsyncBufferOptions<T> {
  data?: Iterable<T>;
  cancel?: CancelFn;
}

export class AsyncIterationBuffer<T = any> implements AsyncIterable<T> {
  private readonly requests = new Denque();
  private readonly queue = new Denque();
  private readonly cancel: CancelFn;
  constructor(options: AsyncBufferOptions<T> = {}) {
    this.cancel = options.cancel || NullCancelFn;
    if (options.data) {
      for (const datum of options.data) {
        this.push(datum);
      }
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    const { requests, queue, cancel } = this;
    return {
      next(): Promise<IteratorResult<T>> {
        try {
          if (queue.length > 0) {
            return queue.shift();
          }
        } catch (e) {
          return Promise.reject(e);
        }

        return new Promise((resolve, reject) => {
          requests.push({ resolve, reject });
        });
      },
      return(): Promise<IteratorResult<T>> {
        return new Promise((resolve) => {
          Promise.resolve(cancel()).finally(() => {
            while (requests.length > 0) {
              requests.shift().resolve({ value: undefined, done: true });
            }
            resolve({ value: undefined, done: true });
          });
        });
      },
    };
  }

  private _push(value: T, done: boolean): this {
    const { requests, queue } = this;
    const result = { value, done };
    if (requests.length > 0) {
      requests.shift().resolve(result);
    } else {
      queue.push(Promise.resolve(result));
    }
    return this;
  }
  push(value: T): this {
    return this._push(value, false);
  }

  throw(value: Error): void {
    const { requests, queue } = this;
    if (requests.length > 0) {
      requests.shift().reject(value);
    } else {
      queue.push(Promise.reject(value));
    }
  }

  done(value?: T): this {
    if (arguments.length) {
      this.push(value);
    }
    return this._push(undefined, true);
  }

  static of(...args) {
    const buffer = new this();
    for (let i = 0; i < args.length; ++i) {
      buffer.push(args[i]);
    }
    return buffer;
  }
}
