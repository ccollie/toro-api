import { EventBus, WriteCache } from '../redis';
import { parseTimestamp } from '../lib/datetime';
import {
  StatisticalSnapshot,
  StatisticalSnapshotOptions,
  StatsGranularity,
  StatsMetricType,
} from '../../types';
import { systemClock } from '../lib';
import { StatsClientBase } from './statsClientBase';
import Status from './status';
import { QueueManager } from '../queues';

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
  readonly bus: EventBus;

  constructor(queueManager: QueueManager) {
    super(queueManager.queue);
    this.bus = queueManager.bus;
    this.writer = queueManager.hostManager.writer;
  }

  get hasLock(): boolean {
    return this.writer.hasLock;
  }

  /**
   * Clean a range of items
   * @param jobType
   * @param type
   * @param unit
   * @param retention  retention time in ms. Items with score < (latest - retention) are removed
   * @return the number of items removed
   */
  async cleanup(
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    retention: number,
  ): Promise<number> {
    const srcKey = this.getKey(jobType, type, unit);
    const multi = this.writer.multi;

    const removed = await this._callStats(multi, 'truncate', srcKey, retention);
    await this.bus.emit('stats.cleanup', {
      key: srcKey,
      type,
      unit,
      retention,
    });
    return removed;
  }

  updateCounts(data, jobType: string): void {
    // todo: store all this in a single hash
    // global queue counter
    if (!this.hasLock) return;
    if (data.completed + data.failed) {
      const update = {};

      if (data.completed) {
        update['COMPLETED'] = data.completed;
      }

      if (data.failed) {
        update['FAILED'] = data.failed;
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
    const { type, jobType, unit, ts = systemClock.getTime() } = options;
    const _ts = parseTimestamp(ts);
    const key = this.getKey(jobType, type, unit);

    const data = JSON.stringify(stats);
    const eventName = `stats.${type}.updated`;
    const eventData = {
      jobName: jobType,
      ts: _ts,
      type,
      unit,
      data,
    };
    (multi as any).timeseries(key, 'add', data);
    this.bus.pipelineEmit(multi, eventName, eventData);
  }

  /**
   * @private
   * @param snapshot
   * @param {String} jobType
   * @param {String} tag
   * @private
   */
  private _writeSnapshot(
    snapshot: StatisticalSnapshot,
    tag: StatsMetricType,
    jobType: string = null,
  ): void {
    if (this.hasLock) {
      const options: StatsWriteOptions = {
        jobType,
        type: tag,
        ts: snapshot.endTime,
      };

      this.writeSnapshot(snapshot, options);

      // todo: add COMPLETED and FAILED to queue, queue + jobtype, host
      this.updateCounts(snapshot, jobType);
    }
  }

  writeStats(status: Status, options?: StatisticalSnapshotOptions): void {
    if (!status || !status.hasData) return;
    if (!this.hasLock) return;
    const { startTime, endTime } = options || {};

    const latencySnap: StatisticalSnapshot = {
      ...status.getLatencySnapshot(),
      startTime,
      endTime,
    };

    const waitSnap: StatisticalSnapshot = {
      ...status.getWaitTimeSnapshot(),
      startTime,
      endTime,
    };

    const { jobType } = status;
    this._writeSnapshot(latencySnap, 'latency', jobType);
    this._writeSnapshot(waitSnap, 'wait', jobType);
  }
}
