import { Meter, type MeteredRates, type MeterSummary } from './meter';
import { Clock } from '../lib';
import type { Histogram } from 'hdr-histogram-js';
import { getHistogramSnapshot, createHistogram } from './utils';
import { toDate } from 'date-fns';
import type { HistogramSnapshot } from './types';

/**
 * A convenience wrapper class for a {@link Timer} to measure durations.
 *
 * @export
 * @class StopWatch
 */
export class StopWatch {
  /**
   * Used to determine a duration.
   *
   * @private
   * @type {Clock}
   */
  private readonly clock: Clock;
  /**
   * The timer the duration is reported to.
   *
   * @private
   * @type {Timer}
   */
  private readonly timer: Timer;
  /**
   * Gets set when the start function is invoked using the clock.
   *
   * @private
   * @type {number}
   */
  private startTime: number;

  /**
   * Creates an instance of StopWatch.
   *
   * @param {Clock} clock
   * @param {Timer} timer
   */
  public constructor(clock: Clock, timer: Timer) {
    this.clock = clock;
    this.timer = timer;
  }

  /**
   * Sets the startTime variable.
   *
   * @returns {this}
   */
  public start(): this {
    this.startTime = this.getTime();
    return this;
  }

  /**
   * Adds the duration between the last invocation of the start function
   * and this invocation to the timer in nanoseconds.
   *
   * @returns {this}
   */
  public stop(): this {
    this.timer.addDuration(this.getTime() - this.startTime);
    return this;
  }

  private getTime(): number {
    return this.clock.getTime();
  }
}

/**
 * A Timer is a combination of a {@link Histogram} (for the duration of an event)
 * and a {@link Meter} (for the rate of events).
 *
 * @export
 * @class Timer
 */
export class Timer {
  /**
   * Used to determine a duration.
   *
   * @private
   * @type {Clock}
   */
  private readonly clock: Clock;
  /**
   * Metric to measure the event rate.
   *
   * @private
   * @type {Meter}
   */
  private readonly meter: Meter;
  /**
   * Metric to measure the duration of events.
   *
   * @private
   * @type {Histogram}
   */
  private readonly histogram: Histogram;

  /**
   * Creates an instance of Timer.
   *
   * @param {Clock} clock
   */
  public constructor(clock: Clock) {
    this.clock = clock;
    this.meter = new Meter(clock);
    this.histogram = createHistogram();
  }

  destroy(): void {
    this.histogram.destroy();
    this.meter.destroy();
  }

  private getTime(): number {
    return this.clock.getTime();
  }

  /**
   * Gets the sum from the internal {@link Histogram}.
   *
   * @readonly
   * @type {string}
   */
  public get sum(): BigInt {
    throw new Error('not implemented');
  }

  /**
   * Gets the count of event reported.
   *
   * @readonly
   * @type {number}
   */
  public get count(): number {
    return this.getCount();
  }

  /**
   * Getter method for mean-rate
   *
   * @readonly
   * @type {number}
   */
  public get meanRate(): number {
    return this.getMeanRate();
  }

  /**
   * Getter method for rates 'snapshot'
   *
   * @readonly
   * @type {MeteredRates}
   * @memberof Timer
   */
  public get rates(): MeteredRates {
    return {
      15: this.get15MinuteRate(),
      5: this.get5MinuteRate(),
      1: this.get1MinuteRate(),
    };
  }

  /**
   * Adds a duration manually.
   *
   * @param {number} duration in ms
   * @returns {this}
   */
  public addDuration(duration: number): this {
    if (duration >= 0) {
      this.histogram.recordValue(duration);
      this.meter.mark(1);
    }
    return this;
  }

  // Record the duration of an event that started at a time and ends now.
  updateSince(t: Date | number): this {
    const now = this.clock.getTime();
    const then = toDate(t).getTime();
    return this.addDuration(now - then);
  }

  public add(other: Timer): this {
    this.histogram.add(other.histogram);
    this.meter.mark(other.meter.count);
    return this;
  }

  /**
   * Gets the count from the embedded {@link Histogram}.
   *
   * @returns {number}
   */
  public getCount(): number {
    return this.histogram.totalCount;
  }

  /**
   * Gets the average rate per second of last 15 minutes.
   *
   * @returns {number}
   */
  public get15MinuteRate(): number {
    return this.meter.get15MinuteRate();
  }

  /**
   * Gets the average rate per second of last 5 minutes.
   *
   * @returns {number}
   */
  public get5MinuteRate(): number {
    return this.meter.get5MinuteRate();
  }

  /**
   * Gets the average rate per second of last minute.
   *
   * @returns {number}
   */
  public get1MinuteRate(): number {
    return this.meter.get1MinuteRate();
  }

  /**
   * Gets the mean rate from the embedded {@link Meter}.
   *
   * @returns {number}
   */
  public getMeanRate(): number {
    return this.meter.meanRate;
  }

  getPercentile(p: number): number {
    return this.histogram.getValueAtPercentile(p);
  }

  reset(resetMeter = true): this {
    this.histogram.reset();
    resetMeter && this.meter.reset();
    return this;
  }

  // /**
  //  * Gets the bucket counts from the internal {@link Histogram}.
  //  *
  //  * @returns {Map<number, number>}
  //  * @memberof Timer
  //  */
  // public getCounts(): Map<number, number> {
  //   return this.histogram.getCounts();
  // }

  /**
   * Measures the duration of the passed function's invocation
   * synchronously and adds it to the pool.
   *
   * @template T
   * @returns {T}
   */
  public time<T>(f: () => T): T {
    const startTime = this.getTime();
    try {
      return f();
    } finally {
      this.addDuration(this.getTime() - startTime);
    }
  }

  /**
   * Measures the duration of the passed function's invocation
   * asynchronously and adds it to the pool.
   *
   * @template T
   * @returns {T}
   */
  public async timeAsync<T>(f: () => Promise<T>): Promise<T> {
    const startTime = this.getTime();
    return await f()
      .then((res) => {
        this.addDuration(this.getTime() - startTime);
        return res;
      })
      .catch((err) => {
        this.addDuration(this.getTime() - startTime);
        throw err;
      });
  }

  /**
   * Builds a new StopWatch.
   *
   * @returns {StopWatch}
   */
  public newStopWatch(): StopWatch {
    return new StopWatch(this.clock, this);
  }

  /**
   * Same as {@link BaseMetric#toJSON()}, also adding the values of the internal
   * histogram property.
   *
   * @returns {*}
   */
  public toJSON(): any {
    const histogramJson = getHistogramSnapshot(this.histogram);
    const meterJson = this.meter.toJSON();
    return {
      ...meterJson,
      ...histogramJson,
    };
  }

  public getSnapshot(): TimerSnapshot {
    return this.toJSON();
  }

  getRateSummary(): MeterSummary {
    return this.meter.getSummary();
  }
}

export interface TimerSnapshot extends HistogramSnapshot, MeterSummary {}

export interface StatisticalSnapshot extends TimerSnapshot {
  failed?: number;
  completed?: number;
  startTime?: number;
  endTime?: number;
}
