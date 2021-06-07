/* eslint-env mocha */
import { ManualClock, systemClock } from '@src/server/lib';
import { Meter, MeterProperties, SECONDS, TimeUnit } from '@src/server/stats';

describe('Meter', () => {
  let clock: ManualClock;
  let meter: Meter;

  const defaultOptions: MeterProperties = {
    rateUnit: TimeUnit.SECONDS,
    interval: 1 * SECONDS,
  };

  beforeEach(() => {
    clock = new ManualClock(0);
    meter = new Meter(clock, defaultOptions);
  });

  afterEach(() => {
    meter.destroy();
  });

  it('can construct a Meter', () => {
    const meter = new Meter(systemClock);
    expect(meter).toBeDefined();
  });

  it('single mark and check rates with no tick', () => {
    expect(meter.count).toBe(0);
    expect(meter.meanRate).toBe(0);
    expect(meter.get1MinuteRate()).toBe(0);
    expect(meter.get5MinuteRate()).toBe(0);
    expect(meter.get15MinuteRate()).toBe(0);

    meter.mark(1);
    expect(meter.count).toBe(1);
    expect(meter.meanRate).toBe(Infinity);
    expect(meter.get1MinuteRate()).toBe(0);
    expect(meter.get5MinuteRate()).toBe(0);
    expect(meter.get15MinuteRate()).toBe(0);
  });

  it('mark using fluent interface', (): void => {
    expect(meter.count).toBe(0);
    expect(meter.meanRate).toBe(0);
    expect(meter.get1MinuteRate()).toBe(0);
    expect(meter.get5MinuteRate()).toBe(0);
    expect(meter.get15MinuteRate()).toBe(0);

    meter.mark(1).mark(2).mark(3).mark(4);

    expect(meter.count).toBe(10);
    expect(meter.meanRate).toBe(Infinity);
    expect(meter.get1MinuteRate()).toBe(0);
    expect(meter.get5MinuteRate()).toBe(0);
    expect(meter.get15MinuteRate()).toBe(0);
  });

  it('mark and tick and check rates', (): void => {
    expect(meter.count).toBe(0);
    expect(meter.meanRate).toBe(0);
    expect(meter.get1MinuteRate()).toBe(0);
    expect(meter.get5MinuteRate()).toBe(0);
    expect(meter.get15MinuteRate()).toBe(0);

    meter.mark(1);
    clock.set(1001);

    expect(meter.count).toBe(1);
    expect(meter.meanRate).toBeLessThan(1);
    expect(meter.get1MinuteRate()).toEqual(1);
    expect(meter.get5MinuteRate()).toEqual(1);
    expect(meter.get15MinuteRate()).toEqual(1);
  });

  it('mark and multi tick and check rates withing same rate-interval', (): void => {
    expect(meter.count).toBe(0);
    expect(meter.meanRate).toBe(0);
    expect(meter.get1MinuteRate()).toBe(0);
    expect(meter.get5MinuteRate()).toBe(0);
    expect(meter.get15MinuteRate()).toBe(0);

    meter.mark(10);

    clock.set(1001);

    expect(meter.count).toBe(10);
    expect(meter.meanRate).toBeLessThan(10);
    expect(meter.get1MinuteRate()).toEqual(10);
    expect(meter.get5MinuteRate()).toEqual(10);
    expect(meter.get15MinuteRate()).toEqual(10);

    meter.mark(20);

    clock.set(2001);

    expect(meter.count).toBe(30);
    expect(meter.meanRate).toBeLessThan(15);
    expect(meter.meanRate).toBeGreaterThan(10);
    expect(meter.get1MinuteRate()).toEqual(10);
    expect(meter.get5MinuteRate()).toEqual(10);
    expect(meter.get15MinuteRate()).toEqual(10);
  });

  it('multi mark and tick and check rates', (): void => {
    expect(meter.count).toBe(0);
    expect(meter.meanRate).toBe(0);
    expect(meter.get1MinuteRate()).toBe(0);
    expect(meter.get5MinuteRate()).toBe(0);
    expect(meter.get15MinuteRate()).toBe(0);

    meter.mark(1);
    meter.mark(3);
    meter.mark(5);

    clock.set(1001);

    expect(meter.count).toBe(9);
    expect(meter.meanRate).toBeLessThan(9);
    expect(meter.get1MinuteRate()).toEqual(9);
    expect(meter.get5MinuteRate()).toEqual(9);
    expect(meter.get15MinuteRate()).toEqual(9);
  });

  it('mark and multi tick and check rates within different rate-intervals', (): void => {
    expect(meter.count).toBe(0);
    expect(meter.meanRate).toBe(0);
    expect(meter.get1MinuteRate()).toBe(0);
    expect(meter.get5MinuteRate()).toBe(0);
    expect(meter.get15MinuteRate()).toBe(0);

    meter.mark(10);

    clock.set(1001);

    expect(meter.count).toBe(10);
    expect(meter.meanRate).toBeLessThan(10);
    expect(meter.get1MinuteRate()).toEqual(10);
    expect(meter.get5MinuteRate()).toEqual(10);
    expect(meter.get15MinuteRate()).toEqual(10);

    meter.mark(80);

    clock.set(5001);

    expect(meter.count).toBe(90);
    expect(meter.meanRate).toBeLessThan(18);
    expect(meter.meanRate).toBeGreaterThan(17);
    expect(meter.get1MinuteRate()).toBeLessThan(11);
    expect(meter.get1MinuteRate()).toBeGreaterThan(10);
    expect(meter.get5MinuteRate()).toBeLessThan(11);
    expect(meter.get5MinuteRate()).toBeGreaterThan(10);
    expect(meter.get15MinuteRate()).toBeLessThan(11);
    expect(meter.get15MinuteRate()).toBeGreaterThan(10);
  });

  it('check serialization', (): void => {
    meter.mark(10);
    clock.set(1001);

    meter.mark(80);

    clock.set(5001);

    expect(meter.count).toBe(90);
    expect(meter.meanRate).toBeLessThan(18);
    expect(meter.meanRate).toBeGreaterThan(17);
    expect(meter.get1MinuteRate()).toBeLessThan(11);
    expect(meter.get1MinuteRate()).toBeGreaterThan(10);
    expect(meter.get5MinuteRate()).toBeLessThan(11);
    expect(meter.get5MinuteRate()).toBeGreaterThan(10);
    expect(meter.get15MinuteRate()).toBeLessThan(11);
    expect(meter.get15MinuteRate()).toBeGreaterThan(10);

    const serializedMeter = JSON.parse(JSON.stringify(meter));
    expect(Object.keys(serializedMeter).length).toBe(6);

    expect(serializedMeter).toHaveProperty('count');
    expect(serializedMeter.count).toBe(90);

    expect(serializedMeter).toHaveProperty('meanRate');
    expect(serializedMeter.meanRate).toBeCloseTo(17.99, 3);

    expect(serializedMeter).toHaveProperty('rates');
    expect(serializedMeter.rates[1]).toBeCloseTo(10.612, 3);
    expect(serializedMeter.rates[5]).toBeCloseTo(10.131, 3);
    expect(serializedMeter.rates[15]).toBeCloseTo(10.044, 3);
  });
});
