import { QueueBasedMetric, QueueBasedMetricSchema } from './baseMetric';
import { ObjectSchema } from 'joi';
import { Events } from './constants';
import { DurationSchema } from '../validation/schemas';
import { JobFinishedEventData } from '../queues';
import { ApdexCalculator } from '../stats';
import { MetricTypes, QueueMetricOptions } from './types';

export interface ApdexMetricOptions extends QueueMetricOptions {
  threshold: number;
}

const schema = QueueBasedMetricSchema.append({
  threshold: DurationSchema.required(),
});

/**
 * The Apdex score is a ratio value of the number of satisfied and tolerating
 * requests to the total requests. Each satisfied client counts as one client,
 * while each tolerating client counts as half a satisfied client.
 */
export class ApdexMetric extends QueueBasedMetric {
  private readonly _data: ApdexCalculator;

  constructor(options: ApdexMetricOptions) {
    super(options);
    this._data = new ApdexCalculator(options.threshold);
  }

  static get key(): MetricTypes {
    return MetricTypes.Apdex;
  }

  static get description(): string {
    return 'Latency APDEX score';
  }

  static get unit(): string {
    return '';
  }

  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this._data.update(event.latency);
    this.update(this._data.getScore(), event.ts);
  }

  reset(): void {
    this._data.reset();
  }

  static get schema(): ObjectSchema {
    return schema;
  }
}
