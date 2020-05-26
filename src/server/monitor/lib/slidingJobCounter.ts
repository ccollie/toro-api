import round from 'lodash/round';
import Emittery from 'emittery';
import { SlidingWindowCounter } from './slidingWindowCounter';
import { QueueListener } from '../queues';
import { SlidingWindowOptions } from '../lib/slidingWindow';

const ONE_SECOND = 1000;

export class SlidingJobCounter extends Emittery {
  private _counter: SlidingWindowCounter;
  private readonly _unlisten: Function;

  constructor(queueListener: QueueListener, options?: SlidingWindowOptions) {
    super();
    this._counter = new SlidingWindowCounter(options);
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

  onTick(handler): void {
    this._counter.onTick(handler);
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
    const deltaSecs = this._counter.timeSpan / ONE_SECOND;
    return deltaSecs === 0 ? 0 : round(this.failures / deltaSecs, 1);
  }

  get errorPercentage(): number {
    return this.completed ? round(this.failures / this.completed, 2) * 100 : 0;
  }

  get jobRate(): number {
    const deltaSecs = this._counter.timeSpan / ONE_SECOND;
    return deltaSecs === 0 ? 0 : round(this.completed / deltaSecs, 1);
  }
}
