import Deque from 'double-ended-queue';
import OnlineNormalEstimator from './onlineNormalEstimator';
import { SlidingWindow } from './slidingWindow';
import { getSlidingWindowDefaults } from './utils';

function calcBuckets(duration?: number, period?: number) {
  if (!duration || !period) {
    const defaults = getSlidingWindowDefaults();
    duration = duration || defaults.duration;
    period = period || defaults.period;
  }
  return Math.max(Math.ceil(duration / period) * 10, 1000); // ??
}

export class SlidingWindowStats {
  private readonly _windows: SlidingWindow<Deque>;
  private readonly _estimator: OnlineNormalEstimator;
  private _currentWindow: any;

  constructor(duration: number, period?: number) {
    const buckets = calcBuckets(duration, period); // ??
    this._windows = new SlidingWindow(
      { duration, period },
      () => new Deque(buckets),
    );
    this._estimator = new OnlineNormalEstimator();
    this.onTick((data) => this.rotate(data));
    this._currentWindow = this._windows.current;
  }

  destroy(): void {
    this._windows.destroy();
  }

  clear(): void {
    this._estimator.reset();
  }

  get count(): number {
    return this._estimator.count;
  }

  update(newValue: number) {
    this._currentWindow.push(newValue);
    this._estimator.add(newValue);
  }

  rotate({ popped, current }): void {
    if (popped !== undefined) {
      for (let i = 0; i < popped.length; i++) {
        const value = popped.get(i);
        this._estimator.remove(value);
      }
      popped.clear();
    }
    this._currentWindow = current;
    this._currentWindow.clear();
  }

  get duration(): number {
    return this._windows.duration;
  }

  get period(): number {
    return this._windows.period;
  }

  get mean(): number {
    this.validate();
    return this._estimator.mean;
  }

  get populationVariance(): number {
    return this._estimator.variance;
  }

  get populationStdev(): number {
    return this._estimator.standardDeviation;
  }

  get sampleVariance(): number {
    return this._estimator.varianceUnbiased;
  }

  get sampleStdev(): number {
    return Math.sqrt(this.sampleVariance);
  }

  summary() {
    return {
      count: this._estimator.numSamples,
      mean: this.mean,
      populationVariance: this.populationVariance,
      sampleVariance: this.sampleVariance,
      populationStdev: this.populationStdev,
      sampleStdev: this.sampleStdev,
    };
  }

  validate(): void {
    if (this.count === 0) {
      throw new TypeError('Mean is undefined');
    }
  }

  onTick(handler) {
    return this._windows.onTick(handler);
  }
}
