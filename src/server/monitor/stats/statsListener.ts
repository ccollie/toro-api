import ms from 'ms';
import Emittery from 'emittery';
import { QueueListener } from '../queues';
import { StatsClient } from '../stats/statsClient';
import { StatisticalSnapshotOptions } from '@src/types';
import { isNumber } from '../../lib/utils';
import { roundInterval, roundUp } from '../../lib/datetime';
import { accurateInterval } from '../../lib/timers';
import Status from './status';
import config from '../../config';
import { Queue } from 'bullmq';

const DEFAULT_SNAPSHOT_INTERVAL = ms('20 secs');
const FINISHED_EVENT = 'job.finished';

/**
 * A class that listens to a queue (via a {@link QueueListener}) and
 * generates periodic statistical snapshots
 */
export class StatsListener extends Emittery {
  private readonly listener: QueueListener;
  private readonly client: StatsClient;
  private readonly snapshotInterval: number;
  private _unlisten: Function = null;
  queueStats: Status;
  private _intervalTimer: any;
  private _snapshotting: boolean;
  private jobTypesMap: Map<string, Status>;
  private readonly isValidJobName: (arg) => boolean;
  /** the valid job types (job.name in bullmq) to store stats for */
  private readonly jobTypes: string[];

  /**
   * Construct a {@link StatsListener}
   * @param {QueueListener} queueListener
   * @param {StatsClient} statsClient
   * @param {Number} [interval]
   * @param {string[]} jobTypes valid job types to process.
   * Store stats for all if null
   */
  constructor(
    queueListener: QueueListener,
    statsClient: StatsClient,
    interval?: number,
    jobTypes?: string[],
  ) {
    super();
    const { queue } = queueListener;

    this.listener = queueListener;
    this.client = statsClient;

    const snapshotInterval =
      interval ||
      config.getValue('snapshotInterval', DEFAULT_SNAPSHOT_INTERVAL);

    this.snapshotInterval = roundInterval(snapshotInterval);

    this.jobTypesMap = new Map();
    this.queueStats = new Status(queue);
    this._snapshotting = false;
    this._intervalTimer = null;

    if (jobTypes && jobTypes.length > 0) {
      this.isValidJobName = (name) => jobTypes.includes(name);
    } else {
      this.isValidJobName = () => true;
    }
  }

  destroy(): void {
    this.stopSnapshots();
    this.unlisten();
  }

  /**
   * @property {*} queue the bull Queue we're listening to
   * @return {Queue}
   */
  get queue(): Queue {
    return this.listener.queue;
  }

  get hasLock(): boolean {
    return this.client.hasLock;
  }

  unlisten(): void {
    if (this._unlisten) {
      this._unlisten();
      this._unlisten = null;
    }
    this.stopSnapshots();
    // this.listener.unlisten();
  }

  getJobTypeStats(name: string): Status {
    let jobTypeStats = this.jobTypesMap.get(name);
    if (!jobTypeStats && this.isValidJobName(name)) {
      jobTypeStats = new Status(this.queue, name);
      this.jobTypesMap.set(name, jobTypeStats);
    }

    return jobTypeStats;
  }

  async onFinished(data) {
    const { job, ts, latency, wait, failed } = data;

    const jobTypeStats = this.getJobTypeStats(job.name);
    if (isNumber(wait) && wait) {
      jobTypeStats && jobTypeStats.markWaiting(wait, ts);
      this.queueStats.markWaiting(wait, ts);
    }
    if (isNumber(latency) && latency > 0) {
      if (!failed) {
        jobTypeStats && jobTypeStats.markCompleted(latency, ts);
        this.queueStats.markCompleted(latency, ts);
      } else {
        jobTypeStats && jobTypeStats.markFailed(latency, ts);
        this.queueStats.markFailed(latency, ts);
      }
    }
  }

  writeStats(status: Status, options?: StatisticalSnapshotOptions): void {
    if (!status || !status.hasData || !status.lastTs) return;
    try {
      this.client.writeStats(status, options);
    } finally {
      status.reset();
    }
  }

  /**
   * Start processing current/realtime events
   */
  startListening(): Promise<void> {
    this.unlisten();
    this._unlisten = this.listener.on(FINISHED_EVENT, (data) =>
      this.onFinished(data),
    );
    this.startSnapshots();
    if (!this.listener.isListening) {
      return this.listener.startListening();
    }
  }

  stopSnapshots(): void {
    if (this._intervalTimer) {
      this._intervalTimer.clear();
      this._intervalTimer = undefined;
    }
  }

  startSnapshots(): void {
    if (!this._intervalTimer && isNumber(this.snapshotInterval)) {
      this._intervalTimer = accurateInterval(async () => {
        return this.takeSnapshot();
      }, this.snapshotInterval);
    }
  }

  async takeSnapshot(ts = null) {
    if (this._snapshotting) return;
    this._snapshotting = true;

    const interval = this.snapshotInterval;

    ts = this.queueStats.lastTs || ts;
    const endTime = roundUp(ts, interval);
    const startTime = endTime - interval;
    const opts: StatisticalSnapshotOptions = {
      startTime,
      endTime,
      includePercentiles: true,
      includeData: true,
    };

    // console.log(`Snapshotting ${this.queue.name}.  EndTime = `, new Date(opts.endTime));
    try {
      this.jobTypesMap.forEach((status) => {
        this.writeStats(status, opts);
      });

      this.writeStats(this.queueStats, opts);
    } catch (err) {
      console.log(err);
      console.log(' EndTime = ', new Date(opts.endTime));
    } finally {
      this._snapshotting = false;
    }
  }
}
