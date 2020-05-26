'use strict';
import { isNumber } from 'lodash';
import { SlidingWindow, SlidingWindowOptions } from './slidingWindow';
import { systemClock } from '../../lib/clock';
import { EventEmitter } from 'events';

const DEFAULT_VALUE = 0;

export class SlidingWindowSum extends EventEmitter {
  private _value: number;
  private readonly slidingWindow: SlidingWindow<number>;
  private _lastSet?: number;

  constructor(options: SlidingWindowOptions) {
    super();

    this.slidingWindow = new SlidingWindow(options, DEFAULT_VALUE);

    this._value = DEFAULT_VALUE;
    this._lastSet = systemClock.now();
    this.slidingWindow.on('tick', (data) => this.onTick(data));
  }

  destroy() {
    this.slidingWindow.destroy();
  }

  get value(): number {
    return this._value;
  }

  get duration(): number {
    return this.slidingWindow.duration;
  }

  get period(): number {
    return this.slidingWindow.period;
  }

  onTick({ popped }) {
    if (isNumber(popped)) {
      this._value = this._value - popped;
    }
    this.slidingWindow.current = DEFAULT_VALUE;
  }

  update(newVal: number) {
    this.slidingWindow.current = this.slidingWindow.current + newVal;
    this._value = this._value + newVal;
    return this._value;
  }
}
