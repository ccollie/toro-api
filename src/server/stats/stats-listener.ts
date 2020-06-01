import ms from 'ms';
import { JobFinishedEventData, QueueListener, QueueManager } from '../queues';
import { StatisticalSnapshotOptions } from '@src/types';
import { isNumber } from '../lib';
import { DateLike, roundDown, roundInterval, roundUp } from '../lib/datetime';
import Status from './status';
import { getValue } from '../config';
import { systemClock, Clock } from '../lib';
import { isAfter, toDate } from 'date-fns';
import Timeout = NodeJS.Timeout;
import { StatsWriter } from './stats-writer';
import Emittery from 'emittery';

const DEFAULT_SNAPSHOT_INTERVAL = ms('20 secs');
const FINISHED_EVENT = 'job.finished';

/**
 * A class that listens to a queue (via a {@link QueueListener}) and
 * generates periodic statistical snapshots
 */
export class StatsListener extends StatsWriter {
  private readonly listener: QueueListener;
  private snapshotInterval: number;
  private _unlisten: Emittery.UnsubscribeFn = null;
  queueStats: Status;
  private _intervalTimer: any;
  private _lastTimestamp: number | null;
  private _nextFlush: number | null;
  private _snapshotting: boolean;
  private jobTypesMap: Map<string, Status>;
  private readonly isValidJobName: (arg) => boolean;

  /**
   * Construct a {@link StatsListener}
   * @param queueManager
   * @param {Number} [interval]
   * @param {string[]} jobTypes valid job types to process.
   * Store stats for all if null
   */
  constructor(
    private queueManager: QueueManager,
    interval?: number,
    jobTypes?: string[],
  ) {
    super(queueManager);
    this.listener = new QueueListener(queueManager.queue);
    const snapshotInterval =
      interval || getValue('snapshotInterval', DEFAULT_SNAPSHOT_INTERVAL);

    this.snapshotInterval = roundInterval(snapshotInterval);

    this.jobTypesMap = new Map();
    this.queueStats = new Status(this.listener.clock);
    this._snapshotting = false;
    this._intervalTimer = null;
    this._nextFlush = roundUp(this.getTime(), this.snapshotInterval) - 1;

    if (jobTypes && jobTypes.length > 0) {
      this.isValidJobName = (name) => jobTypes.includes(name);
    } else {
      this.isValidJobName = () => true;
    }
  }

  destroy(): void {
    this.queueStats.destroy();
    for (const stat of this.jobTypesMap.values()) {
      stat.destroy();
    }
    this.unlisten();
  }

  get clock(): Clock {
    return this.listener.clock;
  }

  getTime(): number {
    return this.clock.getTime();
  }

  unlisten(): void {
    if (this._unlisten) {
      this._unlisten();
      this._unlisten = null;
    }
    // this.listener.unlisten();
  }

  getJobTypeStats(name: string): Status {
    let jobTypeStats = this.jobTypesMap.get(name);
    if (!jobTypeStats && this.isValidJobName(name)) {
      jobTypeStats = new Status(this.clock, name);
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

  private updateStats(data: JobFinishedEventData): void {
    const { job, ts, latency, wait } = data;

    this.flushIfNeeded();
    this._lastTimestamp = ts;

    const failed = !data.success;
    const jobTypeStats = this.getJobTypeStats(job.name);
    if (isNumber(wait) && wait) {
      jobTypeStats && jobTypeStats.markWaiting(wait);
      this.queueStats.markWaiting(wait);
    }
    if (isNumber(latency) && latency > 0) {
      if (!failed) {
        jobTypeStats && jobTypeStats.markCompleted(latency);
        this.queueStats.markCompleted(latency);
      } else {
        jobTypeStats && jobTypeStats.markFailed(latency);
        this.queueStats.markFailed(latency);
      }
    }
  }

  flushIfNeeded(): void {
    if (this.getTime() >= this._nextFlush) {
      this.takeSnapshot();
    }
  }

  private write(status: Status, options?: StatisticalSnapshotOptions): void {
    if (!status || !status.hasData) return;
    try {
      this.writeStats(status, options);
    } finally {
      status.reset();
    }
  }

  private _start(ts?: string | DateLike): Promise<void> {
    if (!this.listener.isListening) {
      let start: string;
      if (!ts) {
        start = '$';
      } else if (typeof ts === 'string') {
        start = ts;
      } else {
        start = toDate(ts).getTime().toString();
      }
      return this.listener.startListening(start);
    }
  }

  /**
   * Start processing current/realtime events
   */
  startListening(ts?: string | DateLike): Promise<void> {
    this.unlisten();
    this._unlisten = this.listener.on(
      FINISHED_EVENT,
      (data: JobFinishedEventData) => this.updateStats(data),
    );
    return this._start(ts);
  }

  stopListening(): void {
    this.unlisten();
  }

  takeSnapshot(): void {
    if (this._snapshotting) return;
    this._snapshotting = true;

    const interval = this.snapshotInterval;

    const endTime = this._nextFlush;
    const startTime = endTime - interval;

    this._nextFlush = this._nextFlush + interval;
    const opts: StatisticalSnapshotOptions = {
      startTime,
      endTime,
      includePercentiles: true,
      includeData: true,
    };

    // console.log(`Snapshotting ${this.queue.names}.  EndTime = `, new Date(opts.endTime));
    try {
      this.jobTypesMap.forEach((status) => {
        this.write(status, opts);
      });

      this.write(this.queueStats, opts);
    } catch (err) {
      console.log(err);
      console.log(' EndTime = ', new Date(opts.endTime));
    } finally {
      this._snapshotting = false;
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
  async processRange(
    start: number,
    end: number,
    interval?: number,
  ): Promise<void> {
    const savedInterval = this.snapshotInterval;

    if (interval) {
      this.snapshotInterval = interval;
    }

    start = roundDown(start, interval);
    end = roundUp(end || systemClock.getTime(), interval);

    const TIMEOUT = 5000;

    let timer: Timeout;

    function clearTimer(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    let isCancelled = false;
    let lastSeen: number;
    let iterator: AsyncIterator<JobFinishedEventData>;

    const cancel = () => {
      if (isCancelled) return; // already called
      isCancelled = true;
      clearTimer();
      iterator.return(null).catch((err) => console.log(err));
      this.stopListening();
      this.snapshotInterval = savedInterval;
    };

    const startTimer = (): void => {
      lastSeen = systemClock.getTime();
      timer = setInterval(() => {
        const now = systemClock.getTime();
        if (now - lastSeen > TIMEOUT) {
          // todo: log this
          console.log('timed out WAITING for event');
          cancel();
        }
      }, 500);

      timer.unref();
    };

    this.clearStats();

    const processEvents = async (): Promise<void> => {
      iterator = this.listener.createAsyncIterator<JobFinishedEventData>({
        eventNames: [FINISHED_EVENT],
      });

      const iterable = {
        [Symbol.asyncIterator]: () => iterator,
      };

      await this._start(start);

      startTimer();
      for await (const event of iterable) {
        if (!event || isAfter(this._lastTimestamp, end) || isCancelled) {
          break;
        }
        lastSeen = systemClock.getTime();
        this.updateStats(event);
      }
      clearTimer();
    };

    return processEvents();
  }

  async catchUp(end?: DateLike, interval?: number): Promise<void> {
    interval = interval || this.snapshotInterval;
    end = end || systemClock.getTime();

    const absoluteEnd = roundDown(end, interval);

    const flush = async (type: string, end: number): Promise<void> => {
      await this.setLastWriteCursor(null, type, null, end);
    };

    const processMetric = async (type: string): Promise<void> => {
      const cursor = await this.getLastWriteCursor(null, type);
      const start = roundDown(cursor, interval);
      const key = this.getKey(null, type);
      let end;
      let i = 0;
      for await (const item of this.gapIterator(
        key,
        start,
        absoluteEnd,
        interval,
      )) {
        await this.processRange(item.start, item.end, interval);
        end = item.end;
        i = i++ % 10;
        if (i === 0) {
          // update
          await flush(type, end);
        }
      }
      if (i) {
        return flush(type, end);
      }
    };
    await processMetric('latency');
    await processMetric('wait');
  }
}
