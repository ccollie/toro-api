import ms from 'ms';
import { Queue } from 'bullmq';
import { StatsWriter, StatsWriteOptions } from './statsWriter';
import cron from 'node-cron';
import { isString, random } from 'lodash';
import PQueue from 'p-queue';
import {
  QueueConfig,
  StatisticalSnapshot,
  StatsGranularity,
  StatsMetricType,
  Timespan,
} from '../../types';
import { systemClock } from '../lib/clock';
import {
  DateLike,
  parseTimestamp,
  roundDate,
  roundDown,
  roundToNearest,
  roundUp,
} from '../lib/datetime';
import { aggregateHistograms, getPrevUnit } from './utils';
import { addMilliseconds, isBefore } from 'date-fns';
import { StatsListener } from './statsListener';
import { QueueBus, QueueListener } from '../queues';
import { WriteCache } from '../redis';

const CONFIG = {
  units: ['minutes', 'hours', 'days', 'weeks'],
  cronExpressions: ['* * * * *', '0 * * * *', '0 0 * * *', '0 0 * * 0'],
};

const ONE_SECOND = 1000;

/* eslint @typescript-eslint/no-use-before-define: 0 */

/**
 * Manages rollups and maintenance of queue stats
 */
export class StatsAggregator extends StatsWriter {
  private readonly queueConfig: QueueConfig;
  private readonly activeJobs: Set<any>;
  private readonly workQueue: PQueue;
  private _done: boolean;
  private _started: number;
  private _tasks: any[];
  private readonly _destroyWorkQueue: boolean;

  constructor(
    queue: Queue,
    bus: QueueBus,
    writer: WriteCache,
    config: QueueConfig,
    workQueue: PQueue,
  ) {
    super(queue, bus, writer);
    this.queueConfig = config;
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

  getJobTypes(): string[] {
    const cfg = this.queueConfig;
    return cfg && cfg.jobTypes && Array.isArray(cfg.jobTypes)
      ? cfg.jobTypes
      : [];
  }

  private async getGaps(
    key: string,
    start: DateLike,
    end: DateLike,
    interval: number,
  ): Promise<Timespan[]> {
    start = parseTimestamp(start);
    end = parseTimestamp(end);
    const reply = await this.call('getGaps', key, start, end, interval);
    return parseGapsReply(reply);
  }

  /** Async iterator to get all gaps > interval ms in the given range */
  async *gapIterator(
    key: string,
    start: DateLike,
    end: DateLike,
    interval: number,
  ) {
    const cursorInterval = interval * 500; // todo: scale based on interval

    if (isString(start) && start === '-') {
      start = interval;
    } else {
      start = parseTimestamp(start);
    }

    let cursorStart = roundDown(start, interval);

    if (isString(end) && end === '+') {
      end = systemClock.now();
    } else {
      end = parseTimestamp(end);
    }

    end = roundUp(end, interval);

    while (cursorStart < end) {
      const cursorEnd = cursorStart + cursorInterval - 1;
      const items = await this.getGaps(key, cursorStart, cursorEnd, interval);
      if (items.length) {
        for (let i = 0; i < items.length; i++) {
          yield items[i];
        }
        const last = items[items.length - 1];
        cursorStart = last.end + 1;
      } else {
        cursorStart = cursorStart + cursorInterval;
      }
    }
  }

  private async setCatchupCursor(
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    value,
  ): Promise<void> {
    const key = getCursorKey(jobType, type, unit);
    const update = {};
    update[key] = value;
    await this.setMeta(update);
  }

  private async getCatchUpCursor(
    jobType: string,
    type: StatsMetricType,
    unit?: StatsGranularity,
  ): Promise<string | null> {
    const key = getCursorKey(jobType, type, unit);
    let meta = await this.getMeta();
    meta = meta || {};
    // todo: look at
    return meta[key] || null;
  }

  async catchUpRaw(interval: number, end?: number): Promise<void> {
    const absoluteEnd = roundDown(end || systemClock.now(), interval);

    const queueListener = new QueueListener(this.queue);
    const statsListener = new StatsListener(
      queueListener,
      this.bus,
      this.writer,
    );

    const processMetric = async (type: StatsMetricType): Promise<void> => {
      const cursor = await this.getCatchUpCursor(null, type);

      const start = roundDown(cursor, interval);
      const key = this.getKey(null, type);

      for await (const item of this.gapIterator(
        key,
        start,
        absoluteEnd,
        interval,
      )) {
        await statsListener.processRange(item.start, item.end, interval);
        await this.setCatchupCursor(null, type, null, item.end);
      }
    };

    try {
      await processMetric('latency');
      await processMetric('wait');
    } finally {
      await queueListener.destroy();
      statsListener.destroy();
    }
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

function getCursorKey(
  jobType: string,
  type: string,
  unit: StatsGranularity = null,
): string {
  jobType = jobType || '__default__';
  const key = [jobType, type, unit].filter((value) => !!value).join('-');
  return `cursor:${key}`;
}

function parseGapsReply(response): Timespan[] {
  const result = [];

  if (Array.isArray(response)) {
    for (let i = 0; i < response.length; i += 2) {
      result.push({
        start: parseInt(response[i]),
        end: parseInt(response[i + 1]),
      });
    }
  }

  return result;
}
