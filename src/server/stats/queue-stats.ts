import { Meter } from './meter';
import { Clock } from '../lib';
import { MeterSummary, StatisticalSnapshot } from '../../types';
import { Timer } from './timer';

/**
 * Class to hold statistics aggregated from a queue over
 * a time window
 */
export default class QueueStats {
  public readonly jobType: string = null;
  private readonly wait: Timer;
  private readonly latency: Timer;
  public readonly errors: Meter;
  public readonly errorPercentage: Meter;
  private counts: { waiting: number; completed: number; failed: number };

  constructor(clock: Clock, jobType: string = null) {
    this.jobType = jobType;
    this.wait = new Timer(clock);
    this.latency = new Timer(clock);
    this.errors = new Meter(clock);
    this.errorPercentage = new Meter(clock);
    this.counts = {
      completed: 0,
      failed: 0,
      waiting: 0,
    };
  }

  destroy(): void {
    this.wait.destroy();
    this.latency.destroy();
    this.errors.destroy();
  }

  get hasData(): boolean {
    return this.count > 0;
  }

  get count(): number {
    return this.counts.completed + this.counts.failed;
  }

  clearCounts(): QueueStats {
    this.counts = {
      failed: 0,
      completed: 0,
      waiting: 0,
    };
    return this;
  }

  /**
   * @param {QueueStats} other
   */
  add(other: QueueStats): this {
    this.wait.add(other.wait);
    this.latency.add(other.latency);
    Object.keys(this.counts).forEach((key) => {
      this.counts[key] = (this.counts[key] || 0) + parseInt(other.counts[key]);
    });
    this.errors.mark(this.errors.count);
    return this;
  }

  reset(): this {
    this.latency.reset(false);
    this.wait.reset(false);
    this.clearCounts();
    return this;
  }

  /* Register a FAILED job */
  markFailed(runTime: number): this {
    // do we need to account for runtime of failed jobs ?
    // this.latency.recordValue(runTime);
    this.counts.failed++;
    this.errors.mark();
    this.errorPercentage.mark();
    return this;
  }

  /* Register a COMPLETED job */
  markCompleted(runTime: number): this {
    this.latency.addDuration(runTime);
    this.counts.completed++;
    return this;
  }

  markWaiting(value: number): this {
    this.wait.addDuration(value);
    this.counts.waiting++;
    return this;
  }

  /**
   * Gets the mean rate from the embedded {@link Meter}.
   *
   * @returns {number}
   */
  public getMeanRate(): number {
    return this.latency.meanRate;
  }

  getThroughputRateSummary(): MeterSummary {
    return this.latency.getRateSummary();
  }

  getLatencySnapshot(): StatisticalSnapshot {
    const latencyData = this.latency.toJSON();
    return {
      ...latencyData,
      ...this.counts,
    };
  }

  getWaitTimeSnapshot(): StatisticalSnapshot {
    const latencyData = this.wait.toJSON();
    return {
      ...latencyData,
      ...this.counts,
    };
  }

  getSnapshot(): Record<string, any> {
    const { latency, wait, counts, errors, jobType } = this;
    const latencyData = latency.toJSON();
    const waitData = wait.toJSON();
    return {
      latency: latencyData,
      wait: waitData,
      counts,
      jobType,
      errors: errors.toJSON(),
    };
  }
}
