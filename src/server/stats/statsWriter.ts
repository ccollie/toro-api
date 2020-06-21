import { Queue } from 'bullmq';
import { WriteCache } from '../redis';
import { parseTimestamp } from '../lib/datetime';
import { AbstractHistogram } from 'hdr-histogram-js';
import { getSnapshot, stringEncode } from './utils';
import { QueueBus } from '../queues';
import {
  StatisticalSnapshot,
  StatisticalSnapshotOptions,
  StatsGranularity,
  StatsMetricType,
} from '../../types';
import { systemClock } from '../lib/clock';
import { StatsClientBase } from './statsClientBase';
import IORedis from 'ioredis';

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
export class StatsWriter extends StatsClientBase {
  readonly writer: WriteCache;

  constructor(queue: Queue, bus: QueueBus, writer: WriteCache) {
    super(queue, bus);
    this.writer = writer;
  }

  get client(): IORedis.Redis {
    return this.writer.client;
  }

  get hasLock(): boolean {
    return this.writer.hasLock;
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
}
