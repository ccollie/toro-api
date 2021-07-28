import { TimeWindow } from './time-window';
import { Clock } from '../lib';

export class CounterWindow extends TimeWindow {
  private readonly clock: Clock;
  public currentSlotAmount: number;
  public previousSlotAmount: number;

  constructor(clock: Clock, duration: number) {
    super(duration);
    this.clock = clock;
    this.currentSlotAmount = 0;
    this.previousSlotAmount = 0;
  }

  private get currentTime(): number {
    return this.clock.getTime();
  }

  protected shift(): void {
    this.previousSlotAmount = this.currentSlotAmount;
  }

  protected resetPrevious(): void {
    this.previousSlotAmount = 0;
  }

  protected resetCurrent(): void {
    this.currentSlotAmount = 0;
  }

  inc(amount: number): number {
    this.update(this.clock.getTime());
    this.currentSlotAmount += amount;
    return this.currentSlotAmount;
  }

  calculatePreviousRate(): number {
    this.update(this.currentTime);
    return this.previousSlotAmount * (1000 / this.duration);
  }

  estimateCurrentRate(): number {
    const currentTime = this.currentTime;
    this.update(currentTime);
    const elapsedSlotTime = Math.max(1, currentTime % this.duration);
    return this.currentSlotAmount * (1000 / elapsedSlotTime);
  }

  estimateCompositeRate(): number {
    const currentTime = this.currentTime;
    this.update(currentTime);
    const elapsedSlotTime = currentTime % this.duration;
    const compositeDuration = this.duration + elapsedSlotTime;
    const compositeAmount = this.previousSlotAmount + this.currentSlotAmount;
    return compositeAmount * (1000 / compositeDuration);
  }
}

export default CounterWindow;
