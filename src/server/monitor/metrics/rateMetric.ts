import { BaseMetric, MetricOptions } from './baseMetric';
import schema from './slidingWindowBaseSchema';
import { ObjectSchema } from '@hapi/joi';
import { QueueListener } from '../queues';
import { CounterInterface, createCounter, SlidingWindowCounter } from '../lib';
import { systemClock } from '../../lib/clock';
import round from 'lodash/round';

const SuccessFieldName = 'success';
const FailureFieldName = 'failure';
const ONE_SECOND = 1000;

// TODO: updateFrequency
// Maybe on tick ?
export class RateMetric extends BaseMetric {
  protected readonly counter: CounterInterface;
  private readonly _start = systemClock.now();
  private readonly _isSliding: boolean;

  constructor(
    queueListener: QueueListener,
    rateSelector: (val?: number) => number,
    options: MetricOptions,
  ) {
    super(queueListener, options);
    this.counter = createCounter(options.window);
    this._isSliding = this.counter instanceof SlidingWindowCounter;
    this.subscribe('job.finished', ({ success }) => {
      const val = this.counter.incr(
        success ? SuccessFieldName : FailureFieldName,
      );
      const updated = rateSelector(val);
      this.update(updated);
    });
  }

  destroy(): void {
    this.counter.destroy();
    super.destroy();
  }

  get successes(): number {
    return this.counter.get(SuccessFieldName);
  }

  get failures(): number {
    return this.counter.get(FailureFieldName);
  }

  reset(): void {
    this.counter.reset();
  }

  get completed(): number {
    return this.successes + this.failures;
  }

  get errorRate(): number {
    const deltaSecs = this.timeSpan / ONE_SECOND;
    return deltaSecs === 0 ? 0 : round(this.failures / deltaSecs, 1);
  }

  get errorPercentage(): number {
    return this.completed ? round(this.failures / this.completed, 2) * 100 : 0;
  }

  get jobRate(): number {
    const deltaSecs = this.timeSpan / ONE_SECOND;
    return deltaSecs === 0 ? 0 : round(this.completed / deltaSecs, 1);
  }

  get timeSpan(): number {
    if (this._isSliding) {
      return (this.counter as SlidingWindowCounter).timeSpan;
    }
    return systemClock.now() - this._start;
  }

  static get schema(): ObjectSchema {
    return schema;
  }
}
