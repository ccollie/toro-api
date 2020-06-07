import round from 'lodash/round';
import Emittery from 'emittery';
import {
  createCounter,
  CounterInterface,
  SlidingWindowCounter,
} from './counter';
import { QueueListener } from '../../queues';
import { SlidingWindowOptions } from './slidingWindow';
import { systemClock } from '../../lib/clock';

const ONE_SECOND = 1000;

export class JobCounterOptions {
  window: SlidingWindowOptions;
  jobNames?: string[];
}

export class JobCounter extends Emittery {
  private readonly _counter: CounterInterface;
  private readonly _start = systemClock.now();
  private readonly _unlisten: Function;
  private readonly _isSliding: boolean;

  constructor(queueListener: QueueListener, options?: SlidingWindowOptions) {
    super();
    this._counter = createCounter(options);
    this._isSliding = this._counter instanceof SlidingWindowCounter;
    this._unlisten = queueListener.on('job.finished', ({ failed }) => {
      const field = failed ? 'failure' : 'success';
      this._counter.incr(field);
      return this.emit('update', {
        success: this.successes,
        failure: this.failures,
      });
    });
  }

  destroy(): void {
    this._counter.destroy();
    this._unlisten();
    this.clearListeners();
  }

  reset(): void {
    this._counter.reset();
  }

  get completed(): number {
    return this.successes + this.failures;
  }

  get successes(): number {
    return this._counter.get('success');
  }

  get failures(): number {
    return this._counter.get('failure');
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
      return (this._counter as SlidingWindowCounter).timeSpan;
    }
    return systemClock.now() - this._start;
  }
}
