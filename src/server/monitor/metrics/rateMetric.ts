import { BaseMetric } from './baseMetric';
import { SlidingJobCounter } from '../lib/slidingJobCounter';
import schema from './slidingWindowBaseSchema';
import { SlidingWindowOptions } from '../lib/slidingWindow';
import { ObjectSchema } from '@hapi/joi';
import { QueueListener } from '../queues';

// TODO: updateFrequency
// Maybe on tick ?
export class RateMetric extends BaseMetric {
  protected counter: SlidingJobCounter;
  constructor(queueListener: QueueListener, options?: SlidingWindowOptions) {
    super();
    this.counter = new SlidingJobCounter(queueListener, options);
  }

  destroy(): void {
    this.counter.destroy();
    super.destroy();
  }

  static get schema(): ObjectSchema {
    return schema;
  }
}
