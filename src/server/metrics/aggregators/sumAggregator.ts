import { SlidingWindow, SlidingWindowOptions } from '../lib';
import { BaseAggregator } from './aggregator';
import { systemClock } from '../../lib/clock';
import { isNumber } from 'lodash';

const DEFAULT_VALUE = 0;

/*
An aggregator to return a sum
 */
export class SumAggregator extends BaseAggregator {
  private _value: number;
  private _lastSet?: number;
  private readonly slidingWindow: SlidingWindow<number>;

  /**
   * Construct a SumAggregator
   */
  constructor(options: SlidingWindowOptions) {
    super();
    this.slidingWindow = new SlidingWindow(options, DEFAULT_VALUE);

    this._value = DEFAULT_VALUE;
    this._lastSet = systemClock.now();
    this.slidingWindow.on('tick', (data) => this.onTick(data));
  }

  destroy(): void {
    if (this.slidingWindow) {
      this.slidingWindow.destroy();
    }
    super.destroy();
  }

  static get key(): string {
    return 'sum';
  }

  static get description(): string {
    return 'Sum Of Values';
  }

  get value(): number {
    return this._value;
  }

  private onTick({ popped }): void {
    if (isNumber(popped)) {
      this._value = this._value - popped;
    }
    this.slidingWindow.current = DEFAULT_VALUE;
  }

  update(newVal: number): number {
    if (this.slidingWindow) {
      const now = systemClock.now();
      if (now - this._lastSet > this.slidingWindow.duration) {
        this.slidingWindow.current = DEFAULT_VALUE;
        this._value = DEFAULT_VALUE;
      }
      this.slidingWindow.current = this.slidingWindow.current + newVal;
      this._lastSet = now;
    }
    this._value = this._value + newVal;
    return this._value;
  }
}
