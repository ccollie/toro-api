import { Clock } from '../lib';
import * as units from './units';
import { MeteredRates, MeterSummary } from '../../types';
import { IMovingAverage, MovingAverage } from '@server/stats/moving-average';
import { IntervalMillis, ONE_MINUTE, TimeUnit } from './units';

const FIVE_MINUTES = 5 * units.ONE_MINUTE;
const FIFTEEN_MINUTES = 15 * units.ONE_MINUTE;

/**
 *
 * @interface MeterProperties
 * @typedef MeterProperties
 * @type {Object}
 * @property {number} rateUnit The rate unit. Defaults to 1000 (1 sec).
 * @property {number} interval The interval in which the averages are updated.
 * Defaults to 10000 (10 sec).
 * @example
 * const meter = new Meter(clock, { rateUnit: 1000, interval: 5000})
 */
export interface MeterProperties {
  rateUnit?: TimeUnit;
}

/**
 * A class that uses an exponentially moving average to calculate a
 * rate of events over an interval.
 */
export class BaseMeter {
  /**
   * Max age of the last update in ms.
   *
   * @private
   * @type {number}
   */
  private readonly _rateUnit?: TimeUnit;
  private _lastToJSON: number;
  private _startTime: number;
  private _count = 0;
  protected readonly rateMillis: number;
  private readonly clock: Clock;

  /**
   * @param clock
   * @param {MeterProperties} [properties] see {@link MeterProperties}.
   */
  constructor(clock: Clock, properties?: MeterProperties) {
    this._rateUnit = properties?.rateUnit;
    this.clock = clock;
    this.rateMillis = this.rateUnit ? IntervalMillis[this.rateUnit] : 1;
    this._initializeState();
  }

  /**
   * Initializes the states of this Metric
   */
  protected _initializeState(): void {
    const now = this.getTime();
    this._count = 0;
    this._startTime = now;
    this._lastToJSON = now;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  get rateUnit(): TimeUnit {
    return this._rateUnit;
  }

  get count(): number {
    return this._count;
  }

  protected getTime(): number {
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
    this.update(n);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected update(n: number): this {
    // abstract
    return this;
  }

  /**
   * Resets all values. Meters initialized with custom options will be reset to the default
   * settings (patch welcome).
   */
  reset(): void {
    this._initializeState();
  }

  get meanRate(): number {
    if (this._count === 0) {
      return 0;
    }
    return (this._count / this.elapsedTime) * this.rateMillis;
  }

  toJSON(): Record<string, any> {
    return {
      meanRate: this.meanRate,
      count: this.count,
    };
  }
}

export interface SimpleMeterProperties extends MeterProperties {
  timePeriod: number;
}

export class SimpleMeter extends BaseMeter {
  protected readonly _ewma: IMovingAverage;
  public readonly timePeriod: number;

  constructor(clock: Clock, properties: SimpleMeterProperties) {
    super(clock, properties);
    this.timePeriod = properties.timePeriod;
    this._ewma = MovingAverage(properties.timePeriod);
  }

  protected update(n: number): this {
    this._ewma.update(this.getTime(), n);
    return this;
  }

  get rate(): number {
    return this._ewma.value;
  }

  getRate(unit?: TimeUnit): number {
    const millis = IntervalMillis[unit || this.rateUnit];
    const conversion = this.timePeriod / millis;
    return this._ewma.value * conversion;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      rate: this.rate,
    };
  }
}

/**
 * Things that are measured as events / interval.
 */
export class Meter extends BaseMeter {
  private _m1Rate: IMovingAverage;
  private _m5Rate: IMovingAverage;
  private _m15Rate: IMovingAverage;

  /**
   * @param clock
   * @param {MeterProperties} [properties] see {@link MeterProperties}.
   */
  constructor(clock: Clock, properties?: MeterProperties) {
    super(clock, properties);
  }

  /**
   * Initializes the states of this Metric
   * @protected
   */
  protected _initializeState(): void {
    super._initializeState();
    this._m1Rate = MovingAverage(ONE_MINUTE);
    this._m5Rate = MovingAverage(FIVE_MINUTES);
    this._m15Rate = MovingAverage(FIFTEEN_MINUTES);
  }

  /**
   * Register n events as having just occurred. Defaults to 1.
   * @param {number} [n]
   */
  update(n: number): this {
    const now = this.getTime();
    this._m1Rate.update(now, n);
    this._m5Rate.update(now, n);
    this._m15Rate.update(now, n);
    return this;
  }

  /**
   * Updates the 15 minutes average if needed and returns the rate per second.
   *
   * @returns {number}
   */
  get15MinuteRate(): number {
    return convertRate(this._m15Rate, FIFTEEN_MINUTES, this.rateUnit);
  }

  /**
   * Updates the 5 minutes average if needed and returns the rate per unit.
   *
   * @returns {number}
   */
  get5MinuteRate(): number {
    return convertRate(this._m5Rate, FIVE_MINUTES, this.rateUnit);
  }

  /**
   * Updates the 1 minute average if needed and returns the rate per unit.
   *
   * @returns {number}
   */
  get1MinuteRate(): number {
    return convertRate(this._m1Rate, ONE_MINUTE, this.rateUnit);
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
    return {
      ...super.toJSON(),
      count: this.count,
      meanRate: this.meanRate,
      rates: this.rates,
    };
  }
}

export function convertRate(
  ma: IMovingAverage,
  timespan: number,
  unit?: TimeUnit,
): number {
  const value = ma.value;
  if (!unit) return value;
  const millis = IntervalMillis[unit];
  const conversion = timespan / millis;
  return value * conversion;
}
