import { Clock, TimeTicker } from '../lib';
import * as units from './units';
// eslint-disable-next-line max-len
import { ExponentiallyMovingWeightedAverage as EWMA } from './exponentially-moving-weighted-average';
import { MeteredRates, MeterSummary } from '@src/types';

const RATE_UNIT = units.MINUTES;
const TICK_INTERVAL = 5 * units.SECONDS;

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
  private readonly _interval: number;
  private readonly _rateUnit: number;
  private _lastToJSON: number;
  private _startTime: number;
  private _count = 0;
  private _currentSum = 0;
  private readonly _ticker: TimeTicker;
  private readonly clock: Clock;

  /**
   * @param clock
   * @param {MeterProperties} [properties] see {@link MeterProperties}.
   */
  constructor(clock: Clock, properties: MeterProperties) {
    this._rateUnit = properties.rateUnit || RATE_UNIT;
    this._interval = properties.interval || TICK_INTERVAL;
    this.clock = clock;
    this._ticker = new TimeTicker(this._interval, clock);
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
    this._ticker.reset();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  get interval(): number {
    return this._interval;
  }

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
    this.tickIfNeeded();
    this._count += n;
    this._currentSum += n;
    this.update(n);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected update(n: number): this {
    // abstract
    return this;
  }

  /**
   * Calls the {@link BaseMeter#tick} for each tick.
   *
   * @protected
   */
  tick(n = 1): this {
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
    return (this._count / this.elapsedTime) * this._rateUnit;
  }

  toJSON(): Record<string, any> {
    return {
      meanRate: this.meanRate,
      count: this.count,
    };
  }

  /**
   * Checks whether an update of the averages is needed and if so updates
   * the {@link BaseMeter#lastTime}.
   */
  tickIfNeeded(): boolean {
    const ticksNeeded = this._ticker.tickIfNeeded();
    this.tick(ticksNeeded);
    return !!ticksNeeded;
  }
}

export interface SimpleMeterProperties extends MeterProperties {
  timePeriod: number;
}

export class SimpleMeter extends BaseMeter {
  protected _ewma: EWMA;

  constructor(clock: Clock, properties: SimpleMeterProperties) {
    super(clock, properties);
    this._ewma = new EWMA(properties.timePeriod, this.interval);
  }

  protected update(n: number): this {
    this._ewma.update(n);
    return this;
  }

  /**
   * Calls the {@link SimpleMeter#tick} for each tick.
   *
   * @protected
   */
  tick(n = 1): this {
    this._ewma.tick(n);
    return this;
  }

  get timePeriod(): number {
    return this._ewma.timePeriod;
  }

  get rate(): number {
    return this.getRate(this.rateUnit);
  }

  get instantRate(): number {
    this.tickIfNeeded();
    return this._ewma.instantRate;
  }

  getRate(unit?: number): number {
    this.tickIfNeeded();
    return this._ewma.rate(unit || this.rateUnit);
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      rate: this.rate,
    };
  }
}

const DefaultMeterProperties: MeterProperties = {
  interval: TICK_INTERVAL,
  rateUnit: RATE_UNIT,
};

/**
 * Things that are measured as events / interval.
 */
export class Meter extends BaseMeter {
  private _m1Rate: EWMA;
  private _m5Rate: EWMA;
  private _m15Rate: EWMA;

  /**
   * @param clock
   * @param {MeterProperties} [properties] see {@link MeterProperties}.
   */
  constructor(
    clock: Clock,
    properties: MeterProperties = DefaultMeterProperties,
  ) {
    super(clock, properties);
  }

  /**
   * Initializes the states of this Metric
   * @protected
   */
  protected _initializeState(): void {
    super._initializeState();
    this._m1Rate = new EWMA(units.MINUTES, this.interval);
    this._m5Rate = new EWMA(5 * units.MINUTES, this.interval);
    this._m15Rate = new EWMA(15 * units.MINUTES, this.interval);
  }

  /**
   * Register n events as having just occurred. Defaults to 1.
   * @param {number} [n]
   */
  protected update(n: number): this {
    this._m1Rate.update(n);
    this._m5Rate.update(n);
    this._m15Rate.update(n);
    return this;
  }

  tick(n = 1): this {
    if (n) {
      this._m1Rate.tick(n);
      this._m5Rate.tick(n);
      this._m15Rate.tick(n);
    }
    return this;
  }

  /**
   * Updates the 15 minutes average if needed and returns the rate per second.
   *
   * @returns {number}
   */
  public get15MinuteRate(): number {
    this.tickIfNeeded();
    return this._m15Rate.rate(this.rateUnit);
  }

  /**
   * Updates the 5 minutes average if needed and returns the rate per unit.
   *
   * @returns {number}
   */
  public get5MinuteRate(): number {
    this.tickIfNeeded();
    return this._m5Rate.rate(this.rateUnit);
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
    this.tickIfNeeded();
    return this._m1Rate.rate(this.rateUnit);
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
