import ms from 'ms';
import { Queue } from 'bullmq';
import { StatsClient, StatsWriteOptions } from './statsClient';
import cron from 'node-cron';
import { random } from 'lodash';
import PQueue from 'p-queue';
import {
  QueueConfig,
  StatisticalSnapshot,
  StatsGranularity,
  StatsMetricType,
} from '../../types';
import { systemClock } from '../lib/clock';
import {
  parseTimestamp,
  roundDate,
  roundDown,
  roundToNearest,
  roundUp,
} from '../lib/datetime';
import { aggregateHistograms, getPrevUnit } from './utils';
import { addMilliseconds, isBefore } from 'date-fns';

const CONFIG = {
  units: ['minutes', 'hours', 'days', 'weeks'],
  cronExpressions: ['* * * * *', '0 * * * *', '0 0 * * *', '0 0 * * 0'],
};

const ONE_SECOND = 1000;

/**
 * Manages rollups and maintenance of queue stats
 */
export class StatsAggregator {
  private readonly host: string;
  private readonly queue: Queue;
  private readonly queueConfig: QueueConfig;
  private readonly activeJobs: Set<any>;
  private readonly statsClient: StatsClient;
  private readonly workQueue: PQueue;
  private _done: boolean;
  private _started: number;
  private _tasks: any[];
  private readonly _destroyWorkQueue: boolean;

  constructor(
    host: string,
    queue: Queue,
    config: QueueConfig,
    statsClient: StatsClient,
    workQueue: PQueue,
  ) {
    this.queue = queue;
    this.queueConfig = config;
    this.host = host;
    this.statsClient = statsClient;
    this.workQueue = workQueue;

    this.activeJobs = new Set();
    const run = this.run.bind(this);
    this._tasks = CONFIG.units.reduce((res, unit, index) => {
      const expr = CONFIG.cronExpressions[index];
      const task = cron.schedule(expr, () => run(unit), {
        scheduled: false,
      });

      res.push(task);
      return res;
    }, []);

    this.workQueue = workQueue || new PQueue();
    this._destroyWorkQueue = !workQueue;

    this._started = systemClock.now();
    this._done = false;
  }

  destroy(): void {
    this._done = true;
    this._tasks.forEach((task) => task.destroy());
    this._destroyWorkQueue && this.workQueue.clear();
  }

  start(): void {
    this._done = false;
    this._tasks.forEach((task) => task.start());
  }

  clear(): void {
    this._done = true;
    this._tasks.forEach((task) => task.stop());
  }

  get hasLock(): boolean {
    return this.statsClient.hasLock;
  }

  getJobTypes(): string[] {
    const cfg = this.queueConfig;
    return cfg && cfg.jobTypes && Array.isArray(cfg.jobTypes)
      ? cfg.jobTypes
      : [];
  }

  private getKey(
    jobType: string,
    metric: StatsMetricType,
    granularity: StatsGranularity,
  ): string {
    return this.statsClient.getKey(jobType, metric, granularity);
  }

  private async getUpdateMetadata(
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    prevUnit: StatsGranularity,
  ): Promise<Record<string, any>> {
    const srcKey = this.getKey(jobType, type, prevUnit);
    const destKey = this.getKey(jobType, type, unit);

    const [srcSpan, destSpan] = await Promise.all([
      this.statsClient.getSpan(jobType, type, prevUnit),
      this.statsClient.getSpan(jobType, type, unit),
    ]);

    const interval = ms(`1 ${unit}`);

    const srcLastWrite = srcSpan && srcSpan.end;
    const destLastWrite = destSpan && destSpan.end;

    const shouldUpdate =
      srcLastWrite &&
      (!destLastWrite || srcLastWrite - destLastWrite >= interval);

    return {
      srcKey,
      srcLastWrite,
      destKey,
      destLastWrite,
      interval,
      srcSpan,
      destSpan,
      shouldUpdate,
    };
  }

  private async rollupInternal(
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
  ): Promise<boolean> {
    const prevUnit = getPrevUnit(unit);
    const {
      srcKey,
      destKey,
      destLastWrite,
      interval,
      shouldUpdate,
      srcSpan,
    } = await this.getUpdateMetadata(jobType, type, unit, prevUnit);

    if (!shouldUpdate) {
      return false;
    }

    let count = 0;

    const update = async (start): Promise<boolean> => {
      const ts = roundUp(start, interval); // subtract 1 ms ???
      const end = addMilliseconds(ts, -1);
      const data = await this.statsClient.getRange<StatisticalSnapshot>(
        srcKey,
        start,
        end,
      );

      if (!data.length) {
        return false;
      }

      console.log(
        `Aggregating ${data.length} records (${start} - ${end}) to destination ${destKey}`,
      );

      const snapshot = aggregateHistograms(data);
      snapshot.startTime = parseTimestamp(roundToNearest(start, interval));
      snapshot.endTime = parseTimestamp(ts);

      const options: StatsWriteOptions = {
        jobType,
        type,
        ts,
        unit,
      };

      this.statsClient.writeSnapshot(snapshot, options);
      count += data.length;

      return true;
    };

    let start;

    if (destLastWrite) {
      start = addMilliseconds(destLastWrite, 1);
    } else {
      start = roundDown(addMilliseconds(srcSpan.start, -1), interval);
    }

    const end = roundDate(srcSpan.end, interval);
    while (isBefore(start, end)) {
      // todo: check higher level, fill in gaps if necessary
      await update(start);
      start = addMilliseconds(start, interval);
    }

    console.log(`${count} written to ${destKey}`);

    return true;
  }

  private async rollup(unit: StatsGranularity): Promise<void> {
    const types: StatsMetricType[] = ['latency', 'wait'];

    const actions = types.map((type) => {
      return () => this.rollupInternal(null, type, unit);
    });

    this.getJobTypes().forEach((jobType) => {
      types.forEach((type) => {
        actions.push(() => this.rollupInternal(jobType, type, unit));
      });
    });

    // todo: also aggregate at the host level
    await this.workQueue.addAll(actions);
  }

  run(unit: StatsGranularity): void {
    if (this._done) return;
    if (this.hasLock) {
      // add a fudge factor to ensure we encompass the end of
      // the range
      const jitter = random(1, 3) * ONE_SECOND;
      const timeout = setTimeout(async () => {
        if (!this.activeJobs.has(unit)) {
          this.activeJobs.add(unit);
          try {
            await this.rollup(unit);
          } finally {
            this.activeJobs.delete(unit);
          }
        }
      }, jitter);
      timeout.unref();
    }
  }
}
