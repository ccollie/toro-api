import { BaseMetric, MetricOptions } from './baseMetric';
import { MetricType } from '../../types';

export class CounterBasedMetric extends BaseMetric {
  protected internalCount = 0;

  constructor(options: MetricOptions) {
    super(options);
    this._value = 0;
  }

  handleEvent(): void {
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

  static get type(): MetricType {
    return MetricType.Count;
  }
}