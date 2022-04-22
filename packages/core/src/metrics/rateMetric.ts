import { ObjectSchema } from 'joi';
import { QueueBasedMetricSchema, QueuePollingMetric } from './baseMetric';
import { Events } from './constants';
import * as units from '../stats/units';
import { DurationSchema } from '../validation';
import { MetricValueType, QueueMetricOptions } from '../types';
import { IMovingAverage, MovingAverage } from '../stats/moving-average';
import { JobEventData } from '../queues';
import { systemClock } from '../lib';
import { Pipeline } from 'ioredis';
import { Queue } from 'bullmq';

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

  async checkUpdate(
    pipeline: Pipeline,
    queue: Queue,
    ts?: number,
  ): Promise<void> {
    this.update(this.movingAverage.value, ts);
    this.reset();
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

  handleEvent(event?: JobEventData): void {
    this._count++;
    const now = event?.ts ?? systemClock.getTime();
    this.movingAverage.update(now, 1);
    this.update(this.movingAverage.value, now);
  }

  reset(): void {
    this._count = 0;
    this.movingAverage.reset();
  }

  static get schema(): ObjectSchema {
    return QueueBasedRateSchema;
  }

  static get type(): MetricValueType {
    return MetricValueType.Rate;
  }
}
