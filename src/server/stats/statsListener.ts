import ms from 'ms';
import { JobFinishedEvent, QueueListener } from '../queues';
import { StatisticalSnapshotOptions } from '../../types';
import { isNumber } from '../lib/utils';
import { roundDown, roundInterval, roundUp } from '../lib/datetime';
import { accurateInterval } from '../lib/timers';
import Status from './status';
import config from '../config';
import { StatsWriter } from './statsWriter';
import { addMilliseconds, isAfter } from 'date-fns';
import { systemClock } from '../lib/clock';
import { WriteCache } from '../redis';
import { QueueBus } from '../queues';

const DEFAULT_SNAPSHOT_INTERVAL = ms('20 secs');
const FINISHED_EVENT = 'job.finished';

/**
 * A class that listens to a queue (via a {@link QueueListener}) and
 * generates periodic statistical snapshots
 */
export class StatsListener extends StatsWriter {
  private readonly listener: QueueListener;
  private snapshotInterval: number;
  queueStats: Status;
  private _intervalTimer: any;
  private _snapshotting: boolean;
  private jobTypesMap: Map<string, Status>;
  private readonly isValidJobName: (arg) => boolean;
  /** the valid job types (job.name in bullmq) to store stats for */
  private readonly jobTypes: string[];
  private _iterator: AsyncIterator<JobFinishedEvent>;

  /**
   * Construct a {@link StatsListener}
   * @param {QueueListener} queueListener
   * @param {QueueBus} bus
   * @param {Number} [interval]
   * @param {WriteCache} writer
   * @param {string[]} jobTypes valid job types to process.
   * Store stats for all if null
   */
  constructor(
    queueListener: QueueListener,
    bus: QueueBus,
    writer: WriteCache,
    interval?: number,
    jobTypes?: string[],
  ) {
    super(queueListener.queue, bus, writer);
    const { queue } = queueListener;

    this.listener = queueListener;

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

  unlisten(): void {
    if (this._iterator) {
      this._iterator.return().catch((err) => {
        console.log(err);
      });
      this._iterator = null;
    }
    this.stopSnapshots();
    // this.listener.unlisten();
  }

  private getJobTypeStats(name: string): Status {
    let jobTypeStats = this.jobTypesMap.get(name);
    if (!jobTypeStats && this.isValidJobName(name)) {
      jobTypeStats = new Status(this.queue, name);
      this.jobTypesMap.set(name, jobTypeStats);
    }

    return jobTypeStats;
  }

  clearStats(): void {
    this.queueStats.reset();
    for (const [, stats] of this.jobTypesMap.entries()) {
      stats.reset();
    }
  }

  updateStats(data: JobFinishedEvent): void {
    const { job, ts, latency, wait, success } = data;

    const jobTypeStats = this.getJobTypeStats(job.name);
    if (isNumber(wait) && wait) {
      jobTypeStats && jobTypeStats.markWaiting(wait, ts);
      this.queueStats.markWaiting(wait, ts);
    }
    if (isNumber(latency) && latency > 0) {
      if (success) {
        jobTypeStats && jobTypeStats.markCompleted(latency, ts);
        this.queueStats.markCompleted(latency, ts);
      } else {
        jobTypeStats && jobTypeStats.markFailed(latency, ts);
        this.queueStats.markFailed(latency, ts);
      }
    }
  }

  private _writeStats(
    status: Status,
    options?: StatisticalSnapshotOptions,
  ): void {
    if (!status || !status.hasData || !status.lastTs) return;
    try {
      this.writeStats(status, options);
    } finally {
      status.reset();
    }
  }

  /**
   * Process raw job stats in a given (prior) range. This is mostly for processing
   * previous job entries when the server (us) is down for greater than the sampling
   * interval. This allows us to preserve prior stats after restart
   * @param {number} start
   * @param {number} end
   * @param {number} interval
   */
  async processRange(start: number, end: number, interval: number) {
    start = roundDown(start, interval);
    end = roundUp(end || systemClock.now(), interval);

    let intervalTimer;
    let lastTs;
    let nextTs = roundUp(start, interval);

    const queueListener = this.listener;

    const iterator = queueListener.createAsyncIterator<JobFinishedEvent>({
      eventNames: [FINISHED_EVENT],
    });

    async function cleanup(): Promise<void> {
      await queueListener.unlisten();
      if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
      }
    }

    async function cancel(): Promise<void> {
      await iterator.return();
      await cleanup();
    }

    let lastUpdate = systemClock.now();

    function startTimeoutPoller(): void {
      intervalTimer = setInterval(() => {
        if (systemClock.now() - lastUpdate > 5000) {
          cancel();
        }
      }, 1000);

      intervalTimer.unref();
    }

    // ugly, but I need a handle to the iterator so we can call return() on
    // it when we need to quit
    const iterable = {
      [Symbol.asyncIterator]: () => iterator,
    };

    this.clearStats();
    // we're updating manually
    this.stopSnapshots();
    await queueListener.startListening(String(start));
    startTimeoutPoller();

    (async (): Promise<void> => {
      for await (const event of iterable) {
        lastUpdate = systemClock.now();
        const { ts } = event;

        if (isAfter(ts, end)) {
          await cleanup();
          return;
        }

        if (isAfter(ts, nextTs)) {
          lastTs = this.queueStats.lastTs;
          this.takeSnapshot(lastTs, interval);

          nextTs = addMilliseconds(nextTs, interval).getTime();
        }

        this.updateStats(event);
      }
    })().catch((err) => {
      console.log(err);
    });

    return {
      cancel,
    };
  }

  /**
   * Start processing current/realtime events
   */
  startListening(): Promise<void> {
    this.unlisten();
    this._iterator = this.listener.createAsyncIterator<JobFinishedEvent>({
      eventNames: [FINISHED_EVENT],
    });
    // ugly, but I need a handle to the iterator so we can call return() on
    // it when we need to quit
    const iterable = {
      [Symbol.asyncIterator]: () => this._iterator,
    };

    this.clearStats();
    this.startSnapshots();

    (async (): Promise<void> => {
      for await (const event of iterable) {
        this.updateStats(event);
      }
    })();

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

  takeSnapshot(ts?: number, interval?: number): void {
    if (this._snapshotting) return;
    this._snapshotting = true;

    interval = interval || this.snapshotInterval;

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
        this._writeStats(status, opts);
      });

      this._writeStats(this.queueStats, opts);
    } catch (err) {
      console.log(err);
      console.log(' EndTime = ', new Date(opts.endTime));
    } finally {
      this._snapshotting = false;
    }
  }
}
