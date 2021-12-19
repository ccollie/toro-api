import { throttleBatch } from '../throttle-batch';

describe('throttleBatch', () => {

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('one batch', () => {
    const spy = jest.fn();

    const f = throttleBatch<[number]>((xs: number[]) => {
      spy(xs);
    });

    f(1);
    expect(spy.mock.calls[0][0]).toStrictEqual([ 1 ]);
    f(2);
    f(3);
    f(4);
    expect(spy.mock.calls.length).toBe(1);

    jest.advanceTimersByTime(1);
    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[1][0]).toStrictEqual([ 2, 3, 4 ]);
  });


  test('two batches', () => {
    const spy = jest.fn();

    const f = throttleBatch<[number]>(spy, 10);

    f(1);
    expect(spy.mock.calls.length).toBe(1);

    f(2);
    f(3);

    expect(spy.mock.calls.length).toBe(1);

    jest.advanceTimersByTime(9);

    expect(spy.mock.calls.length).toBe(1);

    jest.advanceTimersByTime(1);

    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[1][0]).toStrictEqual( [ 2, 3 ]);

    f(4);
    f(5);

    jest.advanceTimersByTime(9);

    expect(spy.mock.calls.length).toBe(2);

    jest.advanceTimersByTime(1);

    expect(spy.mock.calls.length).toBe(3);
  });

  test('regular calls', () => {

    const spy = jest.fn();

    const f = throttleBatch<[number]>(spy, 2);

    for (const i of Array.from({ length: 8 }).fill(undefined).map((_, i) => i)) {
      f(i);
      jest.advanceTimersByTime(1);
    }

    jest.advanceTimersByTime(1);
    expect(spy.mock.calls.length).toBe(4);
    expect(spy.mock.calls[0][0]).toStrictEqual([ 0 ]);
    expect(spy.mock.calls[1][0]).toStrictEqual([ 1, 2, 3 ]);
    expect(spy.mock.calls[2][0]).toStrictEqual([ 4, 5, 6 ]);
    expect(spy.mock.calls[3][0]).toStrictEqual([ 7 ]);
  });
});

