import { ObjectSchema } from 'joi';
import { QueueBasedMetricSchema, QueuePollingMetric } from './baseMetric';
import { Events } from './constants';
import * as units from '../stats/units';
import { DurationSchema } from '../validation/schemas';
import { MetricsListener } from './metrics-listener';
import { MetricValueType, QueueMetricOptions } from '../../types';
import { IMovingAverage, MovingAverage } from '../stats/moving-average';

/**
 * @interface RateMetricOptions
 * @typedef RateMetricOptions
 * @type {Object}
 * @property {number} timePeriod The measurement interval.
 * @example
 * const meter = new RateMetric({ timePeriod: 60000 })
 */
export interface RateMetricOptions extends QueueMetricOptions {
  timePeriod: number;
}

export const DefaultRateMetricOptions: RateMetricOptions = {
  jobNames: [],
  timePeriod: units.MINUTES, // 1 minute
};

const QueueBasedRateSchema = QueueBasedMetricSchema.append({
  timePeriod: DurationSchema, // change name to timespan ???
});

export class RateMetric extends QueuePollingMetric {
  private movingAverage: IMovingAverage;
  private _count = 0;

  constructor(options: RateMetricOptions = DefaultRateMetricOptions) {
    super(options);
    this.movingAverage = MovingAverage(options.timePeriod);
  }

  destroy(): any {
    return super.destroy();
  }

  init(listener: MetricsListener): void {
    super.init(listener);
    this._count = 0;
    this.movingAverage.reset();
  }

  async checkUpdate(): Promise<void> {
    this.update(this.movingAverage.value);
  }

  get period(): number {
    return this.options.timePeriod;
  }

  get count(): number {
    return this._count;
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  handleEvent(): void {
    this._count++;
    this.movingAverage.update(this.clock.getTime(), 1);
    this.update(this.movingAverage.value);
  }

  reset(): void {
    this.movingAverage.reset();
  }

  static get schema(): ObjectSchema {
    return QueueBasedRateSchema;
  }

  static get type(): MetricValueType {
    return MetricValueType.Rate;
  }
}
