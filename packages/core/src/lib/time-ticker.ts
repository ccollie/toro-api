import { Clock } from './clock';

export class TimeTicker {
  private _lastTick: number;
  private readonly _tickInterval: number;
  private _clock: Clock;

  constructor(tickInterval: number, clock: Clock) {
    this._tickInterval = tickInterval;
    this._clock = clock;
    this._lastTick = clock.getTime();
  }

  get clock(): Clock {
    return this._clock;
  }

  set clock(value: Clock) {
    this._clock = value;
    this._lastTick = this._clock.getTime();
  }

  public get lastTick(): number {
    return this._lastTick;
  }

  public get tickInterval(): number {
    return this._tickInterval;
  }

  private get now(): number {
    return this._clock.getTime();
  }

  reset(): void {
    this._lastTick = this.now;
  }

  tickIfNeeded(handler?: () => void): number {
    const now = this.now;
    const diff = now - this._lastTick;
    if (diff >= this.tickInterval) {
      this._lastTick = now;
      const ticks = Math.floor(diff / this.tickInterval);
      if (handler) {
        for (let i = 0; i < ticks; i++) {
          handler();
        }
      }
      return ticks;
    }
    return 0;
  }

  getElapsedTime(): number {
    return this.now - this._lastTick;
  }
}
