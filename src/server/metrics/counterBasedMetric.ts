import { BaseMetric, QueueBasedMetric } from './baseMetric';
import { MetricValueType, MetricOptions } from '../../types';
import { JobFinishedEventData } from '@src/server/queues';

export class CounterBasedMetric extends BaseMetric {
  protected internalCount = 0;

  constructor(options: MetricOptions) {
    super(options);
    this._value = 0;
  }

  protected incr(delta = 1): void {
    this.internalCount += delta;
    this.update(this.internalCount);
  }

  reset(): void {
    this.internalCount = 0;
    this.update(0);
  }

  static get type(): MetricValueType {
    return MetricValueType.Count;
  }
}

export class QueueCounterBasedMetric extends QueueBasedMetric {
  protected internalCount = 0;

  constructor(options: MetricOptions) {
    super(options);
    this._value = 0;
  }

  handleEvent(event: JobFinishedEventData): void {
    this.incr();
  }

  protected incr(delta = 1): void {
    this.internalCount += delta;
    this.update(this.internalCount);
  }

  reset(): void {
    this.internalCount = 0;
    this.update(0);
  }

  static get type(): MetricValueType {
    return MetricValueType.Count;
  }
}
