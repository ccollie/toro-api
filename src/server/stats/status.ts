import { EventEmitter } from 'events';
import { createHistogram, getHistogramSnapshot, Meter } from '../metrics/lib';
import { Histogram } from 'hdr-histogram-js';
import { Clock } from '../lib';
import { StatisticalSnapshot } from '@src/types';

/**
 * Class to hold statistics aggregated from a queue over
 * a time window
 */
export default class Status extends EventEmitter {
  public readonly jobType: string = null;
  private readonly wait: Histogram;
  private readonly latency: Histogram;
  private readonly meter: Meter;
  private counts: { waiting: number; completed: number; failed: number };

  constructor(clock: Clock, jobType: string = null) {
    super();
    this.jobType = jobType;
    this.wait = createHistogram();
    this.latency = createHistogram();
    this.meter = new Meter(clock);
    this.counts = {
      completed: 0,
      failed: 0,
      waiting: 0,
    };
  }

  destroy(): void {
    this.wait.destroy();
    this.latency.destroy();
  }

  get hasData(): boolean {
    return this.counts.completed + this.counts.failed > 0;
  }

  get count(): number {
    return this.meter.count;
  }

  clearCounts(): Status {
    this.counts = {
      failed: 0,
      completed: 0,
      waiting: 0,
    };
    return this;
  }

  /**
   * @param {Status} other
   */
  add(other: Status): Status {
    this.wait.add(other.wait);
    this.latency.add(other.latency);
    Object.keys(this.counts).forEach((key) => {
      this.counts[key] = (this.counts[key] || 0) + parseInt(other.counts[key]);
    });
    return this;
  }

  reset(): Status {
    this.latency.reset();
    this.wait.reset();
    this.meter.reset();
    this.clearCounts();
    return this;
  }

  /* Register a FAILED job */
  markFailed(runTime: number): this {
    this.latency.recordValue(runTime);
    this.counts.failed++;
    this.meter.mark();
    return this;
  }

  /* Register a COMPLETED job */
  markCompleted(runTime: number): this {
    this.latency.recordValue(runTime);
    this.counts.completed++;
    this.meter.mark();
    return this;
  }

  markWaiting(value: number): this {
    this.wait.recordValue(value);
    this.counts.waiting++;
    return this;
  }

  /**
   * Gets the average rate per second of last 15 minutes.
   *
   * @returns {number}
   */
  public get15MinuteRate(): number {
    return this.meter.get15MinuteRate();
  }

  /**
   * Gets the average rate per second of last 5 minutes.
   *
   * @returns {number}
   */
  public get5MinuteRate(): number {
    return this.meter.get5MinuteRate();
  }

  /**
   * Gets the average rate per second of last minute.
   *
   * @returns {number}
   */
  public get1MinuteRate(): number {
    return this.meter.get1MinuteRate();
  }

  /**
   * Gets the mean rate from the embedded {@link Meter}.
   *
   * @returns {number}
   */
  public getMeanRate(): number {
    return this.meter.meanRate;
  }

  getLatencySnapshot(): StatisticalSnapshot {
    const latencyData = getHistogramSnapshot(this.latency);
    return {
      ...latencyData,
      ...this.counts,
    };
  }

  getWaitTimeSnapshot(): StatisticalSnapshot {
    const latencyData = getHistogramSnapshot(this.wait);
    return {
      ...latencyData,
      ...this.counts,
    };
  }

  getSnapshot(): Record<string, any> {
    const { latency, wait, counts, jobType } = this;
    const latencyData = getHistogramSnapshot(latency);
    const waitData = getHistogramSnapshot(wait);
    return {
      latency: latencyData,
      wait: waitData,
      counts,
      jobType,
    };
  }
}
