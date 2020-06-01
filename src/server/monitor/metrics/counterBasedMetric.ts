import { BaseMetric } from './baseMetric';
import { QueueListener } from '../queues';
import { StatsWindow } from 'stats';
import { SlidingWindowCounter } from '../lib/slidingWindowCounter';
import schema from './slidingWindowBaseSchema';
import { ObjectSchema } from '@hapi/joi';

export interface CounterBasedMetricOpts {
  window: StatsWindow;
  eventName?: string;
  jobNames?: string[];
}

export class CounterBasedMetric extends BaseMetric {
  private readonly counter: SlidingWindowCounter;

  constructor(queueListener: QueueListener, options: CounterBasedMetricOpts) {
    super();
    const { window, eventName } = options;
    this.counter = new SlidingWindowCounter({
      duration: window.duration,
      period: window.period,
    });

    if (typeof eventName === 'string') {
      this.onDestroy(
        queueListener.on(eventName, () => {
          this.update(this.value + 1);
        }),
      );
    }
  }

  static get schema(): ObjectSchema {
    return schema;
  }

  destroy(): void {
    this.counter.destroy();
    super.destroy();
  }

  baseValue(value: number): number {
    return this.counter.set('count', value);
  }

  reset(): void {
    this.update(-1 * this.value);
  }
}
