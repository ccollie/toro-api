import { Clock } from '../lib';
import * as units from './units';
import { MeteredRates, MeterSnapshot, MeterSummary } from '../../types';
import { IMovingAverage, MovingAverage } from './moving-average';

const TICK_INTERVAL = 5 * units.SECONDS;
const ONE_MINUTE = 1 * units.MINUTES;
const FIVE_MINUTES = 5 * units.MINUTES;
const FIFTEEN_MINUTES = 15 * units.MINUTES;
const RATE_UNIT = ONE_MINUTE;

/**
 *
 * @interface MeterProperties
 * @typedef MeterProperties
 * @type {Object}
 * @property {number} rateUnit The rate unit. Defaults to 1000 (1 sec).
 * @property {number} interval The interval in which the averages are updated.
 * Defaults to 5000 (5 sec).
 * @example
 * const meter = new Meter(clock, { rateUnit: 1000, interval: 5000})
 */
export interface MeterProperties {
  rateUnit?: number;
  interval?: number;
}

const DefaultMeterProperties: MeterProperties = {
  interval: TICK_INTERVAL,
  rateUnit: RATE_UNIT,
};

/**
 * A class that uses an exponentially moving average to calculate a
 * rate of events over an interval. Uses an ewma that accommodates uneven
 * update interval
 */
export class IrregularMeter {
  private readonly clock: Clock;
  private readonly _rateUnit: number;
  private _timestamp: number;
  private _startTime: number;
  private _count = 0;
  private _sum = 0;
  private _m1Rate: IMovingAverage;
  private _m5Rate: IMovingAverage;
  private _m15Rate: IMovingAverage;

  /**
   * @param clock
   * @param {MeterProperties} [properties] see {@link MeterProperties}.
   */
  constructor(
    clock: Clock,
    properties: MeterProperties = DefaultMeterProperties,
  ) {
    this._rateUnit = properties.rateUnit || RATE_UNIT;
    this.clock = clock;
    this._initializeState();
  }

  /**
   * Initializes the states of this Metric
   */
  protected _initializeState(): void {
    const now = this.getTime();
    this._count = 0;
    this._sum = 0;
    this._startTime = now;
    this._timestamp = now;
    this._m1Rate = MovingAverage(ONE_MINUTE, this.clock);
    this._m5Rate = MovingAverage(FIVE_MINUTES, this.clock);
    this._m15Rate = MovingAverage(FIFTEEN_MINUTES, this.clock);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  get rateUnit(): number {
    return this._rateUnit;
  }

  get count(): number {
    return this._count;
  }

  private getTime(): number {
    return this.clock.getTime();
  }

  get elapsedTime(): number {
    return this.getTime() - this._startTime;
  }

  /**
   * Register n events as having just occurred. Defaults to 1.
   * @param {number} [n]
   */
  mark(n = 1): this {
    this._count += n;
    this._sum += n;
    this.update(n);
    return this;
  }

  /**
   * Register n events as having just occurred. Defaults to 1.
   * @param {number} [n]
   */
  protected update(n: number): this {
    const now = this.getTime();
    this._m1Rate.update(n);
    this._m5Rate.update(n);
    this._m15Rate.update(n);
    this._startTime = now;
    return this;
  }

  /**
   * Resets all values. Meters initialized with custom options will be reset to the default
   * settings (patch welcome).
   */
  reset(): void {
    this._initializeState();
  }

  /**
   * the rate of the meter since the meter was started
   */
  get meanRate(): number {
    const elapsed = this.elapsedTime;
    return elapsed === 0 ? 0 : (this._sum / elapsed) * this._rateUnit;
  }

  /**
   * Updates the 15 minutes average if needed and returns the rate per second.
   *
   * @returns {number}
   */
  public get15MinuteRate(): number {
    return this._m15Rate.value * this.rateUnit;
  }

  /**
   * Updates the 5 minutes average if needed and returns the rate per unit.
   *
   * @returns {number}
   */
  public get5MinuteRate(): number {
    return this._m5Rate.value * this.rateUnit;
  }

  /**
   * Getter method for rates 'snapshot'
   *
   * @readonly
   * @type {MeteredRates}
   * @memberof Meter
   */
  public get rates(): MeteredRates {
    return {
      15: this.get15MinuteRate(),
      5: this.get5MinuteRate(),
      1: this.get1MinuteRate(),
    };
  }

  /**
   * Updates the 1 minute average if needed and returns the rate per unit.
   *
   * @returns {number}
   */
  public get1MinuteRate(): number {
    return this._m1Rate.value * this.rateUnit;
  }

  getSummary(): MeterSummary {
    return {
      count: this.count,
      meanRate: this.meanRate,
      m1Rate: this.get1MinuteRate(),
      m5Rate: this.get5MinuteRate(),
      m15Rate: this.get15MinuteRate(),
    };
  }

  toJSON(): Record<string, any> {
    return this.snapshot;
  }

  get snapshot(): MeterSnapshot {
    return {
      count: this.count,
      meanRate: this.meanRate,
      rates: this.rates,
    };
  }
}
