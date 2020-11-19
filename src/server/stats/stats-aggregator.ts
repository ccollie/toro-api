import ms from 'ms';
import { StatsWriteOptions } from './stats-client';
import cron from 'node-cron';
import { random } from 'lodash';
import PQueue from 'p-queue';
import {
  StatisticalSnapshot,
  StatsGranularity,
  StatsMetricType,
} from '../../types';
import { systemClock } from '../lib';
import {
  parseTimestamp,
  roundDate,
  roundDown,
  roundToNearest,
  roundUp,
} from '../lib/datetime';
import { aggregateHistograms, getPrevUnit } from './utils';
import { addMilliseconds, isBefore } from 'date-fns';
import { StatsWriter } from './stats-writer';
import { getValue } from '../config';
import { isNumber } from '../lib';
import boom from '@hapi/boom';
import { QueueManager } from '../queues';

const CONFIG = {
  units: ['minutes', 'hours', 'days', 'weeks'],
  cronExpressions: ['* * * * *', '0 * * * *', '0 0 * * *', '0 0 * * 0'],
};

const ONE_SECOND = 1000;

// TEMP
const DEFAULT_RETENTION = ms('10 weeks');

function getRetention(): number {
  const baseValue = getValue('retention');
  if (baseValue) {
    if (isNumber(baseValue)) {
      return parseInt(baseValue);
    }
    const result = ms(baseValue);
    if (!result) {
      throw boom.internal(
        'Invalid value for retention. Val = ' + JSON.stringify(baseValue),
      );
    }
    return parseInt(result);
  }

  return DEFAULT_RETENTION;
}

/**
 * Manages rollups and maintenance of queue stats
 */
export class StatsAggregator extends StatsWriter {
  private readonly activeJobs: Set<any>;
  private readonly workQueue: PQueue;
  private _done: boolean;
  private _started: number;
  private _tasks: any[];
  private readonly _destroyWorkQueue: boolean;

  constructor(private readonly queueManager: QueueManager, workQueue: PQueue) {
    super(queueManager);
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

    this._started = systemClock.getTime();
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

  getJobTypes(): string[] {
    const cfg = this.queueManager.config;
    return cfg && cfg.jobTypes && Array.isArray(cfg.jobTypes)
      ? cfg.jobTypes
      : [];
  }

  public static get retention(): number {
    return getRetention();
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
      this.getSpan(jobType, type, prevUnit),
      this.getSpan(jobType, type, unit),
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
      const data = await this.getRange<StatisticalSnapshot>(srcKey, start, end);

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

      this.writeSnapshot(snapshot, options);
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
