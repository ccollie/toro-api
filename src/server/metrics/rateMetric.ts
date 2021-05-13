import Joi, { ObjectSchema } from 'joi';
import boom from '@hapi/boom';
import { SimpleMeter, TimeUnit } from '../stats';
import { pollingMetricSchema, QueuePollingMetric } from './baseMetric';
import { Events } from './constants';
import * as units from '../stats/units';
import { DurationSchema } from '../validation/schemas';
import { MetricsListener } from './metrics-listener';
import { MetricValueType, PollingMetricOptions } from '../../types';

/**
 * @interface RateMetricOptions
 * @typedef RateMetricOptions
 * @type {Object}
 * @property {number} rateUnit The rate unit. Defaults to 1000 (1 min).
 * @property {number} interval The interval in which the averages are updated.
 * Defaults to 5000 (5 sec).
 * @example
 * const meter = new RateMetric({ rateUnit: 1000, interval: 5000})
 */
export interface RateMetricOptions extends PollingMetricOptions {
  timePeriod: number;
  rateUnit?: TimeUnit;
}

export const DefaultRateMetricOptions: RateMetricOptions = {
  jobNames: [],
  timePeriod: units.MINUTES, // 1 minute
  rateUnit: TimeUnit.MINUTES,
  interval: 5 * units.SECONDS,
};

const schema = pollingMetricSchema.append({
  timePeriod: DurationSchema,
  rateUnit: Joi.number().integer().default(units.MINUTES),
});

export class RateMetric extends QueuePollingMetric {
  private _meter: SimpleMeter;

  constructor(options: RateMetricOptions = DefaultRateMetricOptions) {
    super(options);
  }

  destroy(): any {
    this._meter.destroy();
    return super.destroy();
  }

  init(listener: MetricsListener): void {
    super.init(listener);
    const clock = listener.clock;
    const options = this.options as RateMetricOptions;
    this._meter = new SimpleMeter(clock, options);
  }

  async checkUpdate(): Promise<void> {
    if (this.meter.tickIfNeeded()) {
      this.update(this.meter.rate);
    }
  }

  get period(): number {
    return this.meter.timePeriod;
  }

  get meter(): SimpleMeter {
    if (!this._meter) {
      throw boom.badImplementation('internal states referenced before init');
    }
    return this._meter;
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  handleEvent(): void {
    this.meter.mark();
    this.update(this.meter.rate);
  }

  reset(): void {
    this.meter.reset();
  }

  static get schema(): ObjectSchema {
    return schema;
  }

  static get type(): MetricValueType {
    return MetricValueType.Rate;
  }
}
