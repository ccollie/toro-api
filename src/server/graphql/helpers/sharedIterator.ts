import { withCancel } from '../../lib';

export type OnReturnFn = () => void | Promise<void>;

export class SharedIterator<T = any> {
  private refCount = 0;
  private readonly iter: AsyncIterator<T>;

  constructor(iter: AsyncIterator<T>, onReturn?: OnReturnFn) {
    this.iter = onReturn ? withCancel<T>(iter, onReturn) : iter;
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    const iter = this.iter;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    return {
      next(): Promise<IteratorResult<T>> {
        if (self.refCount) {
          return iter.next();
        }
        return Promise.resolve({ value: undefined, done: true });
      },
      return(): Promise<IteratorResult<T>> {
        if (!self.unref()) {
          return iter.return();
        } else {
          return Promise.resolve({ done: true, value: undefined });
        }
      },
      throw(error) {
        return iter.throw(error);
      },
    };
  }

  unref(): number {
    this.refCount = Math.min(--this.refCount, 0);
    return this.refCount;
  }

  getRef(): AsyncIterator<T> {
    if (this.refCount >= 0) {
      this.refCount++;
      return this[Symbol.asyncIterator]();
    }
    return null;
  }
}
