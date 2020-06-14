import pAll from 'p-all';
import { Queue } from 'bullmq';
import { WriteCache } from '../redis';
import { DateLike, parseTimestamp, roundDown, roundUp } from '../lib/datetime';
import { AbstractHistogram } from 'hdr-histogram-js';
import { getSnapshot, stringEncode } from './utils';
import { addMilliseconds, isAfter } from 'date-fns';
import { Timespan } from 'timespan';
import { QueueBus, QueueListener } from '../queues';
import { StatsListener } from './statsListener';
import { getQueueBusKey, getQueueMetaKey, getStatsKey } from '../monitor/keys';
import {
  StatisticalSnapshot,
  StatisticalSnapshotOptions,
  StatsGranularity,
  StatsMetricType,
} from 'index';
import { systemClock } from '../lib/clock';
import IORedis from 'ioredis';

const QUEUE_LISTENER = Symbol('queue listener');
const STATS_LISTENER = Symbol('stats listener');

/* eslint @typescript-eslint/no-use-before-define: 0 */

export type StatsWriteOptions = {
  jobType: string;
  ts: number | Date;
  type: StatsMetricType;
  unit?: StatsGranularity;
};

/**
 * A helper class responsible for managing collected queue stats in redis
 */
export class StatsClient {
  readonly queue: Queue;
  private readonly bus: QueueBus;
  private readonly writer: WriteCache;
  private readonly host: string;

  constructor(host: string, queue: Queue, bus: QueueBus, writer: WriteCache) {
    this.queue = queue;
    this.writer = writer;
    this.host = host;
    this.bus = bus;
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

  cleanup(
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    retention: number,
  ) {
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
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, 'latency', unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  getWaitTimes(
    jobName: string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, 'wait', unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  async getSpan(jobType: string, tag: string, unit?: StatsGranularity) {
    const key = this.getKey(jobType, tag, unit);
    const span = this.call('span', key);
    if (Array.isArray(span)) {
      const [start, end] = span;
      return { start, end };
    }
    return null;
  }

  async getLast(
    jobName: string,
    tag: string,
    unit: StatsGranularity,
  ): Promise<StatisticalSnapshot> {
    const key = this.getKey(jobName, tag, unit);
    const [, value] = await this.call('last', key);
    if (value) {
      return JSON.parse(value) as StatisticalSnapshot;
    }
    return null;
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

  writeSnapshot(stats: StatisticalSnapshot, options: StatsWriteOptions): void {
    if (!this.hasLock) return;

    const multi = this.writer.multi;
    const { type, jobType, unit, ts = systemClock.now() } = options;
    const _ts = parseTimestamp(ts);
    const key = this.getKey(jobType, type, unit);

    const data = JSON.stringify(stats);
    const eventName = `stats.${type}.updated`;
    const eventData = {
      jobName: jobType,
      ts: _ts,
      unit,
      data,
    };
    multi.zadd(key, _ts.toString(), data);
    this.bus.pipelineEmit(multi, eventName, eventData);
  }

  async setCatchupCursor(
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    value,
  ) {
    const key = getCursorKey(jobType, type, unit);
    const update = {};
    update[key] = value;
    return this.setMeta(update);
  }

  async getCatchUpCursor(
    jobType: string,
    type: StatsMetricType,
    unit?: StatsGranularity,
  ) {
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

    const processMetric = async (type: StatsMetricType): Promise<void> => {
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
   * interval. This allows us to preserve prior stats after restart
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

    async function finish(): Promise<void> {
      if (unlisten) unlisten();
      await queueListener.unlisten();
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
          finish().finally(resolve);
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
    tag: StatsMetricType,
    counts,
    opts: StatisticalSnapshotOptions,
  ): void {
    if (this.hasLock) {
      let intervalSnapshot = getSnapshot(hist, opts);
      if (counts) {
        intervalSnapshot = { ...intervalSnapshot, ...counts };
      }

      intervalSnapshot.data = stringEncode(hist);

      const options: StatsWriteOptions = {
        jobType,
        type: tag,
        ts: opts.endTime,
      };

      this.writeSnapshot(intervalSnapshot, options);

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

  private onStatsUpdate(
    type: StatsMetricType,
    jobName: string,
    granularity: StatsGranularity,
  ): AsyncIterator<StatisticalSnapshot> {
    function filter(_, data: any): boolean {
      return (
        data &&
        data.value &&
        (!data.jobName || data.jobName === jobName) &&
        (!data.unit || data.unit === granularity)
      );
    }

    function transform(_, data: any): StatisticalSnapshot {
      return JSON.parse(data.value) as StatisticalSnapshot;
    }

    const eventName = `stats.${type}.updated`;
    return this.bus.createAsyncIterator<any, StatisticalSnapshot>({
      eventNames: [eventName],
      filter,
      transform,
    });
  }

  latencyStatsUpdateIterator(
    jobName: string,
    granularity: StatsGranularity,
  ): AsyncIterator<StatisticalSnapshot> {
    return this.onStatsUpdate('latency', jobName, granularity);
  }

  waitTimeStatsUpdateIterator(
    jobName: string,
    granularity: StatsGranularity,
  ): AsyncIterator<StatisticalSnapshot> {
    return this.onStatsUpdate('wait', jobName, granularity);
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

  private call(method: string, key: string, ...args): Promise<any> {
    return this._callStats(this.client, method, key, ...args);
  }

  getKey(jobType: string, tag: string, unit?: StatsGranularity): string {
    return getStatsKey(null, this.queue, jobType, tag, unit);
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
