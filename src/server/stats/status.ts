import { Queue } from 'bullmq';
import { EventEmitter } from 'events';
import { createHistogram } from './utils';
import { AbstractHistogram } from 'hdr-histogram-js';

/**
 * Class to hold statistics aggregate from a queue over
 * a time window
 */
export default class Status extends EventEmitter {
  private readonly queue: Queue;
  private readonly jobType: string = null;
  private wait: AbstractHistogram;
  private latency: AbstractHistogram;
  private counts: { waiting: number; completed: number; failed: number };
  lastTs: null;

  constructor(queue: Queue, jobType: string = null) {
    super();
    this.queue = queue;
    this.jobType = jobType;
    this.wait = createHistogram();
    this.latency = createHistogram();
    this.counts = {
      completed: 0,
      failed: 0,
      waiting: 0,
    };
    this.lastTs = null;
  }

  get hasData(): boolean {
    return this.counts.completed + this.counts.failed > 0;
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
  add(other): Status {
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
    this.clearCounts();
    this.lastTs = null;
    return this;
  }

  /* Register a failed job */
  markFailed(runTime: number, ts): Status {
    this.latency.recordValue(runTime);
    this.counts.failed++;
    this.lastTs = ts;
    return this;
  }

  /* Register a completed job */
  markCompleted(runTime: number, ts) {
    this.latency.recordValue(runTime);
    this.counts.completed++;
    this.lastTs = ts;
    return this;
  }

  markWaiting(value: number, ts) {
    this.wait.recordValue(value);
    this.counts.waiting++;
    this.lastTs = ts;
    return this;
  }
}
