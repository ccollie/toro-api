import { TimeTicker, ManualClock } from 'packages/core/src/lib/index';
import { random } from '@alpen/shared';

describe('TimeTicker', () => {
  it('should construct a valid instance', () => {
    const clock = new ManualClock();
    const ticker = new TimeTicker(1000, clock);

    expect(ticker).toBeDefined();
    expect(clock).toStrictEqual(clock);
    expect(ticker.tickInterval).toBe(1000);
  });

  it('ticks when it should', () => {
    const Interval = 1000;
    const clock = new ManualClock();
    const ticker = new TimeTicker(Interval, clock);

    for (let i = 0; i < 5; i++) {
      const expectedTicks = random(2, 5);
      clock.advanceBy(expectedTicks * Interval);
      const actualTicks = ticker.tickIfNeeded();
      expect(actualTicks).toBe(expectedTicks);
    }
  });

  it('doesnt tick when it should not', () => {
    const Interval = 1000;
    const clock = new ManualClock();
    const ticker = new TimeTicker(Interval, clock);

    clock.advanceBy(500);
    expect(ticker.tickIfNeeded()).toBe(0);
  });

  it('calls a callback when it ticks', () => {
    const Interval = 1000;
    const clock = new ManualClock();
    const ticker = new TimeTicker(Interval, clock);

    const spy = jest.fn();
    let expectedCount = 0;

    for (let i = 0; i < 5; i++) {
      const expectedTicks = random(2, 5);
      expectedCount += expectedTicks;
      clock.advanceBy(expectedTicks * Interval);
      ticker.tickIfNeeded(spy);
    }

    expect(spy).toHaveBeenCalledTimes(expectedCount);
  });

  it('returns the last time it ticked', () => {
    const Interval = 1000;
    const clock = new ManualClock();
    const ticker = new TimeTicker(Interval, clock);

    clock.advanceBy(Interval * 3);
    ticker.tickIfNeeded();
    expect(ticker.lastTick).toBe(clock.getTime());
  });

  it('can return the time elapsed since the last tick', () => {
    const Interval = 1000;
    const clock = new ManualClock();
    const ticker = new TimeTicker(Interval, clock);

    const secs = random(5, 10);
    const start = ticker.lastTick;
    const elapsed = Interval * secs;
    clock.advanceBy(elapsed);

    expect(ticker.getElapsedTime()).toBe(elapsed);
  });
});
