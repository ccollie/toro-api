import ms from 'ms';
import pAll from 'p-all';
import { Queue } from 'bullmq';
import { WriteCache } from '../../redis';
import {
  roundDown,
  roundUp,
  parseTimestamp,
  roundToNearest,
  roundDate,
} from '../../lib/datetime';
import { AbstractHistogram } from 'hdr-histogram-js';
import {
  aggregateHistograms,
  getSnapshot,
  stringEncode,
  getPrevUnit,
} from './utils';
import { addMilliseconds, isAfter, isBefore } from 'date-fns';
import { Timespan } from 'timespan';
import { QueueListener } from '../queues';
import { StatsListener } from './statsListener';
import { getStatsKey, getQueueBusKey, getQueueMetaKey } from '../keys';
import { QueueConfig } from 'config';
import {
  StatisticalSnapshot,
  StatisticalSnapshotOptions,
  StatsGranularity,
} from '@src/types';
import { systemClock } from '../../lib/clock';
import IORedis from 'ioredis';

const QUEUE_LISTENER = Symbol('queue listener');
const STATS_LISTENER = Symbol('stats listener');

/* eslint @typescript-eslint/no-use-before-define: 0 */

/**
 * A helper class responsible for managing collected queue stats in redis
 */
export class StatsClient {
  readonly queue: Queue;
  private readonly writer: WriteCache;
  private readonly host: string;
  private readonly queueConfig: QueueConfig;

  constructor(
    host: string,
    queue: Queue,
    config: QueueConfig,
    writer: WriteCache,
  ) {
    this.queue = queue;
    this.writer = writer;
    this.host = host;
    this.queueConfig = config;
    const listener = (this[QUEUE_LISTENER] = new QueueListener(host, queue));
    this[STATS_LISTENER] = new StatsListener(listener, this);
  }

  destroy(): any {
    const listener = this[QUEUE_LISTENER];
    if (listener) {
      (listener as QueueListener).destroy();
    }
  }

  get client(): IORedis.Redis {
    return this.writer.client;
  }

  get hasLock(): boolean {
    return this.writer.hasLock;
  }

  get busKey(): string {
    return getQueueBusKey(this.queue);
  }

  cleanup(jobType: string, type: string, unit: string, retention: number) {
    const srcKey = this.getKey(jobType, type, unit);
    const multi = this.writer.multi;

    return this._callStats(multi, 'cleanup', srcKey, retention);
  }

  getLastWriteTimestamp(tag = 'latency') {
    const key = this.getKey(null, tag);
    return this.call('last', key);
  }

  async getRange<T = any>(key: string, start, end): Promise<T[]> {
    start = parseTimestamp(start);
    end = parseTimestamp(end);
    const reply = await this.client.zrange(key, start, end);
    const result = new Array<T>();
    reply.forEach((data) => {
      try {
        const value = JSON.parse(data) as T;
        if (value) {
          result.push(value);
        }
      } catch {}
    });
    return result;
  }

  getLatency(
    jobName: string,
    unit: StatsGranularity,
    start,
    end,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, 'latency', unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  getWaitTimes(
    jobName: string,
    unit: StatsGranularity,
    start,
    end,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, 'wait', unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  async getSpan(jobType: string, tag: string, unit: string) {
    const key = this.getKey(jobType, tag, unit);
    return this.call('span', key);
  }

  async getLast(jobType: string, tag: string, unit: string) {
    const key = this.getKey(jobType, tag, unit);
    return this.call('last', key);
  }

  async getMeta(): Promise<Record<string, string>> {
    const key = getQueueMetaKey(this.queue);
    return this.client.hgetall(key);
  }

  async setMeta(data) {
    const key = getQueueMetaKey(this.queue);
    return this.client.hmset(key, data);
  }

  async getGaps(
    key: string,
    start,
    end,
    interval: number,
  ): Promise<Timespan[]> {
    start = parseTimestamp(start);
    end = parseTimestamp(end);
    const reply = await this.call('getGaps', key, start, end, interval);
    return parseGapsReply(reply);
  }

  /** Async iterator to get all gaps > interval ms in the given range */
  async *gapIterator(key: string, start, end, interval: number) {
    const cursorInterval = interval * 500; // todo: scale based on interval

    if (start === '-') {
      start = interval;
    } else {
      start = parseTimestamp(start);
    }

    let cursorStart = roundDown(start, interval);

    if (end === '+') {
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

  async rollup(jobType: string, type: string, unit: string): Promise<boolean> {
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
      await this.writeStatsInternal(destKey, ts, snapshot);
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

  updateCounts(data, jobType: string): void {
    // todo: store all this in a single hash
    // global queue counter
    if (!this.hasLock) return;
    if (data.completed + data.failed) {
      const update = {};

      if (data.completed) {
        update['completed'] = data.completed;
      }

      if (data.failed) {
        update['failed'] = data.failed;
      }

      // update queue
      let key = this.getKey(null, 'counts');
      this.writer.hincr(key, update);

      if (jobType) {
        key = this.getKey(jobType, 'counts');
        this.writer.hincr(key, update);
      }
    }
  }

  private writeStatsInternal(key: string, ts, stats: StatisticalSnapshot) {
    const multi = this.writer.multi;
    ts = parseTimestamp(ts);
    return this._callStats(multi, 'add', key, ts, JSON.stringify(stats));
  }

  async setCatchupCursor(jobType: string, type: string, unit: string, value) {
    const key = getCursorKey(jobType, type, unit);
    const update = {};
    update[key] = value;
    return this.setMeta(update);
  }

  async getCatchUpCursor(jobType: string, type: string, unit?: string) {
    const key = getCursorKey(jobType, type, unit);
    let meta = await this.getMeta();
    meta = meta || {};
    // todo: look at
    return meta[key] || 0;
  }

  async catchUpRaw(end, interval: number) {
    const absoluteEnd = roundDown(end, interval);

    const flush = async (type, tasks, end): Promise<void> => {
      await pAll(tasks, { concurrency: 4 });
      await this.setCatchupCursor(null, type, null, end);
    };

    const processMetric = async (type): Promise<void> => {
      const cursor = await this.getCatchUpCursor(null, type);

      const start = roundDown(cursor, interval);
      const key = this.getKey(null, type);

      let taskList = [];
      let end: number;

      for await (const item of this.gapIterator(
        key,
        start,
        absoluteEnd,
        interval,
      )) {
        taskList.push(() =>
          this.processRawStats(item.start, item.end, interval),
        );
        end = item.end;

        if (taskList.length % 10 === 0) {
          // update
          await flush(type, taskList, end);
          taskList = [];
        }
      }

      if (taskList.length) {
        return flush(type, taskList, end);
      }
    };

    await processMetric('latency');
    await processMetric('wait');
  }

  /**
   * Process raw job stats in a given (prior) range. This is mostly for processing
   * previous job entries when the server (us) is down for greater than the sampling
   * interval. This allows us to preserve prior after restart
   * @param {number} start
   * @param {number} end
   * @param interval
   */
  private async processRawStats(start: number, end: number, interval: number) {
    const FINISHED_EVENT = 'job.finished';

    start = roundDown(start, interval);
    end = roundUp(end || systemClock.now(), interval);

    let timer;
    let lastTs;
    let nextTs = roundUp(start, interval);

    let unlisten;

    function clearTimer(): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    let isCancelled = false;
    const queueListener = this[QUEUE_LISTENER] as QueueListener;
    const statsListener = this[STATS_LISTENER] as StatsListener;

    function finish(): void {
      if (unlisten) unlisten();
      queueListener.unlisten();
      clearTimer();
      isCancelled = true;
    }

    function refresh(): void {
      clearTimer();
      // stop listening if there's more than 5 secs after last update
      timer = setTimeout(finish, 5000);
      timer.unref();
    }

    const res = new Promise((resolve) => {
      async function onCompleted(data): Promise<void> {
        const { ts } = data;

        if (isAfter(ts, end) || isCancelled) {
          finish();
          resolve();
          return;
        }

        if (isAfter(ts, nextTs)) {
          lastTs = statsListener.queueStats.lastTs;
          await statsListener.takeSnapshot(lastTs);

          nextTs = addMilliseconds(nextTs, interval).getTime();
          refresh();
        }

        return statsListener.onFinished(data);
      }

      unlisten = queueListener.on(FINISHED_EVENT, onCompleted);
      queueListener.startListening(String(start));

      refresh();
    });

    return {
      finish: res,
      cancel: finish,
    };
  }

  private async getUpdateMetadata(
    jobType: string,
    type: string,
    unit: string,
    prevUnit: string,
  ) {
    const srcKey = this.getKey(jobType, type, prevUnit);
    const destKey = this.getKey(jobType, type, unit);

    const [srcSpan, destSpan] = await Promise.all([
      this.getSpan(jobType, type, prevUnit),
      this.getSpan(jobType, type, unit),
    ]);

    const interval = ms(`1 ${unit}`);

    if (srcSpan) {
      srcSpan.start = parseTimestamp(srcSpan.start);
      srcSpan.end = parseTimestamp(srcSpan.end);
    }

    if (destSpan) {
      destSpan.start = parseTimestamp(destSpan.start);
      destSpan.end = parseTimestamp(destSpan.end);
    }
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

  /**
   * @private
   * @param hist
   * @param {String} jobType
   * @param {String} tag
   * @param counts
   * @param {Object} opts
   * @private
   */
  private _writeHistogram(
    hist: AbstractHistogram,
    jobType: string = null,
    tag: string,
    counts,
    opts: StatisticalSnapshotOptions,
  ): void {
    if (this.hasLock) {
      let intervalSnapshot = getSnapshot(hist, opts);
      if (counts) {
        intervalSnapshot = { ...intervalSnapshot, ...counts };
      }

      intervalSnapshot.data = stringEncode(hist);

      const key = this.getKey(jobType, tag);
      this.writeStatsInternal(key, opts.endTime, intervalSnapshot);

      // todo: add completed and failed to queue, queue + jobtype, host
      this.updateCounts(intervalSnapshot, jobType);
    }
  }

  writeStats(status, options?: StatisticalSnapshotOptions): void {
    if (!status || !status.hasData || !status.lastTs) return;
    if (!this.hasLock) return;
    const { latency, wait, counts, jobType } = status;
    this._writeHistogram(latency, jobType, 'latency', counts, options);
    this._writeHistogram(wait, jobType, 'wait', counts, options);
  }

  private _callStats(
    client,
    method: string,
    key: string,
    ...args
  ): Promise<any> {
    client = client || this.client;
    return (client as any).stats(key, this.busKey, method, ...args);
  }

  call(method: string, key: string, ...args): Promise<any> {
    return this._callStats(this.client, method, key, ...args);
  }

  getKey(jobType: string, tag: string, unit = null): string {
    return getStatsKey(null, this.queue, jobType, tag, unit);
  }
}

function getCursorKey(jobType: string, type: string, unit: string): string {
  jobType = jobType || '__QUEUE__';
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
