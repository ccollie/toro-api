import { JobFinishedEventData, QueueListener, QueueManager } from '../queues';
import { StatisticalSnapshotOptions, StatsMetricType } from '../../types';
import { DateLike, roundDown, roundInterval, roundUp } from '@lib/datetime';
import QueueStats from './queue-stats';
import { systemClock, Clock, isNumber } from '../lib';
import { isAfter, toDate } from 'date-fns';
import { StatsWriter } from './stats-writer';
import Emittery from 'emittery';
import logger from '../lib/logger';
import { TimeSeries } from '@server/commands';
import { CONFIG, getSnapshotInterval } from './utils';
import { StatsClient } from './stats-client';

const FINISHED_EVENT = 'job.finished';

export enum StatsListenerEvents {
  SNAPSHOT_STARTED = 'SNAPSHOT_STARTED',
  SNAPSHOT_ENDED = 'SNAPSHOT_ENDED',
}

/**
 * A class that listens to a queue (via a {@link QueueListener}) and
 * generates periodic statistical snapshots
 */
export class StatsListener extends StatsWriter {
  private readonly listener: QueueListener;
  private readonly isValidJobName: (arg) => boolean;
  private readonly snapshotInterval: number;
  private _unlisten: Emittery.UnsubscribeFn = null;
  private _intervalTimer: any;
  private _lastTimestamp: number | null;
  private _nextFlush: number | null;
  private _snapshotting: boolean;
  private jobTypesMap: Map<string, QueueStats>;
  private readonly _manager: QueueManager;
  public readonly queueStats: QueueStats;

  /**
   * Construct a {@link StatsListener}
   * @param queueManager
   * @param {string[]} jobTypes valid job types to process.
   * Store stats for all if null
   */
  constructor(queueManager: QueueManager, jobTypes?: string[]) {
    super(queueManager);
    this.listener = new QueueListener(queueManager.queue);

    this.snapshotInterval = roundInterval(getSnapshotInterval());

    this.jobTypesMap = new Map();
    this.queueStats = new QueueStats(this.listener.clock);
    this._snapshotting = false;
    this._intervalTimer = null;
    this._nextFlush = roundUp(this.getTime(), this.snapshotInterval) - 1;

    if (jobTypes && jobTypes.length > 0) {
      this.isValidJobName = (name) => jobTypes.includes(name);
    } else {
      this.isValidJobName = () => true;
    }

    this._manager = queueManager;
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

  getJobNameStats(name: string): QueueStats {
    let jobNameStats = this.jobTypesMap.get(name);
    if (!jobNameStats && this.isValidJobName(name)) {
      jobNameStats = new QueueStats(this.clock, name);
      this.jobTypesMap.set(name, jobNameStats);
    }

    return jobNameStats;
  }

  clearStats(): void {
    this.queueStats.reset();
    for (const [, stats] of this.jobTypesMap.entries()) {
      stats.reset();
    }
  }

  private updateStats(data: JobFinishedEventData): void {
    const { job, ts, latency, wait } = data;

    if (!this.isValidJobName(job.name)) return;

    this.flushIfNeeded();
    this._lastTimestamp = ts;

    const failed = !data.success;
    const jobTypeStats = this.getJobNameStats(job.name);
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

  private write(
    status: QueueStats,
    options?: StatisticalSnapshotOptions,
  ): void {
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
    const startTime = endTime - interval + 1;

    this._nextFlush = this._nextFlush + interval;
    const opts: StatisticalSnapshotOptions = {
      startTime,
      endTime,
      includeData: true,
    };

    logger.info(
      `Snapshotting ${this.queue.name}.  EndTime = `,
      new Date(opts.endTime),
    );
    this._emit(StatsListenerEvents.SNAPSHOT_STARTED);
    try {
      this.jobTypesMap.forEach((status) => {
        this.write(status, opts);
      });

      this.write(this.queueStats, opts);
    } catch (err) {
      logger.warn(err);
    } finally {
      this._emit(StatsListenerEvents.SNAPSHOT_ENDED);
      this._snapshotting = false;
    }
  }

  /**
   * Process raw job stats in a given (prior) range. This is mostly for processing
   * previous job entries when the server (us) is down for greater than the sampling
   * interval. This allows us to preserve prior stats after restart
   * @param {number} start
   * @param {number} end
   */
  async processRange(start: number, end: number): Promise<void> {
    const interval = this.snapshotInterval;

    start = Math.max(0, roundDown(start, interval));
    end = roundUp(end || systemClock.getTime(), interval);

    const TIMEOUT = 15000;

    let timer: ReturnType<typeof setTimeout>;

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
    };

    const startTimer = (): void => {
      lastSeen = systemClock.getTime();
      timer = setInterval(() => {
        const now = systemClock.getTime();
        if (now - lastSeen > TIMEOUT) {
          // todo: log this
          logger.warn('[StatsListener] timed out WAITING for event');
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

  async catchUp(end?: DateLike): Promise<void> {
    const interval = this.snapshotInterval;
    end = end || systemClock.getTime();

    const client = this.client;
    const absoluteEnd = roundDown(end, interval);

    const flush = async (type: StatsMetricType, end: number): Promise<void> => {
      await this.setLastWriteCursor(null, type, null, end);
    };

    const processMetric = async (type: StatsMetricType): Promise<void> => {
      const cursor = await this.getLastWriteCursor(null, type);
      const start = Math.max(0, roundDown(cursor, interval));
      const key = this.getKey(null, type);
      let end;
      let i = 0;
      const iter = await TimeSeries.getGapIterator(
        client,
        key,
        start,
        absoluteEnd,
        interval,
      );
      for await (const item of iter) {
        await this.processRange(item.start, item.end);
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

  sweep(): void {
    const types: StatsMetricType[] = ['latency', 'wait'];
    const jobNames = Array.from(this.jobTypesMap.keys());
    const client = new StatsClient(this._manager);

    CONFIG.units.map((unit) => {
      types.forEach((type) => {
        client.cleanup(false, null, type, unit);
        client.cleanup(true, null, type, unit);
      });

      jobNames.forEach((jobName) => {
        types.forEach((type) => {
          client.cleanup(false, jobName, type, unit);
          client.cleanup(true, jobName, type, unit);
        });
      });
    });
    // todo: also delete at the host level
  }
}
