import OnlineNormalEstimator from './onlineNormalEstimator';
import { SlidingWindow, TickEventData } from './slidingWindow';
import { Clock, systemClock } from '../../lib';
import Denque from 'denque';

export type SummaryStatsField =
  | 'count'
  | 'mean'
  | 'populationVariance'
  | 'sampleVariance'
  | 'populationStdDev'
  | 'sampleStdDev';

export class StreamingStats {
  private readonly window: SlidingWindow<Denque<number>>;
  private readonly _estimator: OnlineNormalEstimator;
  private readonly clock: Clock;
  private _currentWindow: Denque<number>;

  constructor(clock?: Clock, windowSize?: number) {
    this.clock = clock || systemClock;
    if (windowSize !== undefined && windowSize > 0) {
      this.window = new SlidingWindow(
        this.clock,
        windowSize,
        () => new Denque<number>(),
      );
      this.window.onTick((data) => this.rotate(data));
      this._currentWindow = this.window.current;
    }
    this._estimator = new OnlineNormalEstimator();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  clear(): void {
    this._estimator.reset();
  }

  get isSlidingWindow(): boolean {
    return !!this.window;
  }

  get count(): number {
    this.tickIfNecessary();
    return this._estimator.count;
  }

  update(newValue: number): void {
    if (this.isSlidingWindow) {
      this.window.tickIfNeeded();
      this._currentWindow.push(newValue);
    }
    this._estimator.add(newValue);
  }

  protected getTime(): number {
    return this.clock.getTime();
  }

  private rotate(state: TickEventData<Denque<number>>): void {
    const { popped, current } = state;
    if (popped) {
      let value: number | undefined;
      while ((value = popped.pop()) !== undefined) {
        this._estimator.remove(value);
      }
    }
    this._currentWindow = current;
  }

  get mean(): number {
    this.tickIfNecessary();
    return this._estimator.mean;
  }

  get populationVariance(): number {
    this.tickIfNecessary();
    return this._estimator.variance;
  }

  get populationStdev(): number {
    this.tickIfNecessary();
    return this._estimator.standardDeviation;
  }

  get sampleVariance(): number {
    this.tickIfNecessary();
    return this._estimator.varianceUnbiased;
  }

  get sampleStdev(): number {
    this.tickIfNecessary();
    return Math.sqrt(this.sampleVariance);
  }

  summary(): Record<SummaryStatsField, number> {
    return {
      count: this._estimator.numSamples,
      mean: this.mean,
      populationVariance: this.populationVariance,
      sampleVariance: this.sampleVariance,
      populationStdDev: this.populationStdev,
      sampleStdDev: this.sampleStdev,
    };
  }

  validate(): void {
    if (this.count === 0) {
      throw new TypeError('Mean is undefined');
    }
  }

  private tickIfNecessary(): void {
    this.window?.tickIfNeeded();
  }
}
