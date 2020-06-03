import { BaseMetric, MetricOptions } from './baseMetric';
import { QueueListener } from '../queues';
import { CounterInterface, createCounter } from '../lib/counter';
import schema from './slidingWindowBaseSchema';
import { ObjectSchema } from '@hapi/joi';

export class CounterBasedMetric extends BaseMetric {
  private readonly counter: CounterInterface;

  constructor(
    queueListener: QueueListener,
    eventName: string,
    options: MetricOptions,
  ) {
    super(queueListener, options);
    this.counter = createCounter(options.window);
    this._value = 0;
    this.subscribe(eventName, () => {
      const value = this.counter.incr('val', 1);
      this.update(value);
    });
  }

  static get schema(): ObjectSchema {
    return schema;
  }

  destroy(): void {
    this.counter.destroy();
    super.destroy();
  }

  reset(): void {
    this.counter.reset();
    this.update(0);
  }
}
