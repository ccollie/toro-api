import { AsyncIterationBuffer, CancelFn } from '../../../src/server/lib';


describe('AsyncIterationBuffer', () => {
  describe('constructor', () => {
    it('creates an instance with empty parameters', () => {
      let buffer = new AsyncIterationBuffer();
      expect(buffer).toBeDefined();
    });

    it('creates an instance with an initial set of data', async () => {
      const initValues = [1, 2, 3, 5];
      const sut = new AsyncIterationBuffer({
        data: initValues
      });

      let result = [];
      for await (const item of sut) {
        result.push(item);
        if (result.length === initValues.length) break;
      }

      expect(result).toStrictEqual(initValues);
    });

    it('supports a cancel callback', async () => {
      const spy = jest.fn();
      const sut = new AsyncIterationBuffer<number>({
        cancel: spy as CancelFn
      });
      const values = [1, 3, 4]
      sut.push(1);
      sut.push(3);
      sut.done(4);

      // Pull the values out of the buffer by iterating over it
      let i = 0;
      for await (let value of sut) {
        expect(value).toBe(values[i++]);
        if (i >= 3) break;
      }

      expect(spy).toHaveBeenCalledTimes(1);
    });
  })

  describe('iteration', () => {
    it('handles iteration using next()', async () => {
      let buffer = new AsyncIterationBuffer();
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.done();

      let iter = buffer[Symbol.asyncIterator]();

      expect(await iter.next()).toStrictEqual({ value: 1, done: false });
      expect(await iter.next()).toStrictEqual({ value: 2, done: false });
      expect(await iter.next()).toStrictEqual({ value: 3, done: false });
      expect(await iter.next()).toStrictEqual({ value: undefined, done: true });
    });
  });

  describe('.done', () => {
    it('terminates iteration', async () => {
      const sut = new AsyncIterationBuffer();
      sut.push(1);
      sut.push(2);
      sut.done(3);
      sut.throw(new TypeError('This is not good'));
      sut.push(2);

      let e: TypeError;
      let count = 0;
      try {
        for await (const datum of sut) {
          count++;
        }
      } catch(err) {
        e = err;
      }
      expect(e).not.toBeDefined();
      expect(count).toBe(3);
    });
  });

  describe('.throw', () => {
    it('handles throwing an error', async () => {
      const sut = new AsyncIterationBuffer();
      sut.push(1);
      sut.push(2);
      sut.push(3);
      sut.throw(new TypeError('This is not good'));
      sut.push(2);

      let e: TypeError;
      let count = 0;
      try {
        for await (const datum of sut) {
          count++;
        }
      } catch(err) {
        e = err;
      }
      expect(e).toBeInstanceOf(TypeError);
      expect(count).toBe(3);
    });
  });
})
