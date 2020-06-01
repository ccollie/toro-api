import { BaseAggregator } from './aggregator';
import { ExponentiallyMovingWeightedAverage } from '../lib';
import { SECONDS, MINUTES, TimeTicker } from '../lib';
import { Clock, getStaticProp } from '../../lib';
import Joi, { ObjectSchema } from 'joi';
import { DurationSchema } from '../../validation/schemas';
import { BaseMetric } from '../baseMetric';

const DEFAULT_TICKINTERVAL = 5 * SECONDS;
const DEFAULT_TIMEPERIOD = 5 * MINUTES;
const DEFAULT_TIMEUNIT = MINUTES;

const optionsSchema = Joi.object().keys({
  timePeriod: DurationSchema,
  tickInterval: DurationSchema,
  timeUnit: Joi.number().positive().optional().default(DEFAULT_TIMEUNIT),
});

export interface EWMAAggregatorOptions {
  timePeriod: number;
  tickInterval?: number;
  timeUnit?: number; // there
}

const DefaultOptions: EWMAAggregatorOptions = {
  timePeriod: DEFAULT_TIMEPERIOD,
  tickInterval: DEFAULT_TICKINTERVAL,
  timeUnit: DEFAULT_TIMEUNIT,
};

/***
 * Returns the Exponentially Weighted Moving Avg of a stream
 * of values
 */
export class EWMAAggregator extends BaseAggregator {
  private ewma: ExponentiallyMovingWeightedAverage;
  private readonly timeUnit: number;
  private readonly _ticker: TimeTicker;
  private _count = 0;

  /**
   * Construct a EWMAAggregator
   */
  constructor(clock: Clock, options: EWMAAggregatorOptions = DefaultOptions) {
    super(clock);
    this.ewma = new ExponentiallyMovingWeightedAverage(
      options.timePeriod,
      options.tickInterval,
    );
    this.timeUnit = options.timeUnit || DEFAULT_TIMEUNIT;
    this._ticker = new TimeTicker(options.tickInterval, clock);
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
    if (short) {
      return super.getDescription(metric, true);
    }
    return `${type} EWMA`;
  }

  static get key(): string {
    return 'ewma';
  }

  static get description(): string {
    return 'EWMA';
  }

  static get schema(): ObjectSchema {
    return optionsSchema;
  }

  get count(): number {
    return this._count;
  }

  get value(): number {
    return this.ewma.rate();
  }

  update(newVal: number): number {
    this.tickIfNeeded();
    this.ewma.update(newVal);
    this._count++;
    return this.value;
  }

  /**
   * Checks for if an update of the averages is needed and if so
   * updates the {@link Meter#lastTime}
   * @private
   */
  private tickIfNeeded(): boolean {
    return !!this._ticker.tickIfNeeded(() => this.ewma.tick());
  }

  toJSON(): Record<string, any> {
    const type = (this.constructor as any).key;
    return {
      type,
      options: {
        timePeriod: this.ewma.timePeriod,
        tickInterval: this.ewma.tickInterval,
        timeUnit: this.timeUnit,
      },
    };
  }

  reset(): void {
    this.ewma.reset();
  }
}
