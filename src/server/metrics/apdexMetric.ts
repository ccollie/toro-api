import { BaseMetric, baseMetricSchema, MetricOptions } from './baseMetric';
import { ObjectSchema } from 'joi';
import { Events } from './constants';
import { DurationSchema } from '../validation/schemas';
import { JobFinishedEventData } from '../queues';
import { ApdexCalculator } from './lib';

export interface ApdexMetricOptions extends MetricOptions {
  threshold: number;
}

const schema = baseMetricSchema.append({
  threshold: DurationSchema.required(),
});

/**
 * The Apdex score is a ratio value of the number of satisfied and tolerating
 * requests to the total requests. Each satisfied client counts as one client,
 * while each tolerating client counts as half a satisfied client.
 */
export class ApdexMetric extends BaseMetric {
  private readonly _data: ApdexCalculator;

  constructor(options: ApdexMetricOptions) {
    super(options);
    this._data = new ApdexCalculator(options.threshold);
  }

  static get key(): string {
    return 'apdex';
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
    this.update(this._data.getScore());
  }

  reset(): void {
    this._data.reset();
  }

  static get schema(): ObjectSchema {
    return schema;
  }
}