import { deserializePipeline, EventBus } from '../redis';
import { DateLike, endOf, parseTimestamp, startOf } from '../lib/datetime';
import {
  StatisticalSnapshot,
  StatisticalSnapshotOptions,
  StatsGranularity,
  StatsMetricType,
} from '../../types';
import { StatsClient } from './stats-client';
import QueueStats from './queue-stats';
import { QueueManager } from '../queues';
import { TimeSeries } from '../commands/timeseries';
import { aggregateSnapshots, CONFIG, EmptyStatsSnapshot } from './utils';
import { HostManager } from '../hosts';
import random from 'lodash/random';
import isNil from 'lodash/isNil';
import { systemClock } from '../lib';

/* eslint @typescript-eslint/no-use-before-define: 0 */

export type StatsWriteOptions = {
  isHost?: boolean;
  jobName: string;
  metric: StatsMetricType;
  unit?: StatsGranularity;
};

interface RollupMeta {
  key: string;
  start: Date;
  end: Date;
  isHost: boolean;
  unit: StatsGranularity;
  data?: StatisticalSnapshot;
}

// Cache for host rollups
interface HostRollupMeta {
  host: HostManager;
  jobName: string;
  start: number;
  metric: StatsMetricType;
  timeout?: NodeJS.Timeout;
}

const HostRollupCache = new Map<string, HostRollupMeta>();

/**
 * A helper class responsible for managing collected queue stats in redis
 */
export class StatsWriter extends StatsClient {
  private readonly bus: EventBus;
  private readonly hostManager: HostManager;
  private isFinished = false;

  constructor(queueManager: QueueManager) {
    super(queueManager);
    this.bus = queueManager.bus;
    this.hostManager = queueManager.hostManager;
  }

  destroy(): any {
    this.isFinished = true;
    return super.destroy();
  }

  private get hasLock(): boolean {
    return this.writer.hasLock;
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

  private getHostCacheKey(
    metric: StatsMetricType,
    jobName: string,
    start: number,
  ): string {
    return `${this.hostManager.id}:${jobName}:${metric}:${start}`;
  }

  private cacheHostUpdate(
    jobName: string,
    metric: StatsMetricType,
    start: number,
  ): void {
    const key = this.getHostCacheKey(metric, jobName, start);
    let cacheData: HostRollupMeta = HostRollupCache.get(key);
    if (!cacheData) {
      cacheData = {
        host: this.hostManager,
        start,
        jobName,
        metric,
      };
      HostRollupCache.set(key, cacheData);

      // allow time for all queues to report in
      const delay = 2000 + random(3, 5) * 1000;

      cacheData.timeout = setTimeout(() => {
        HostRollupCache.delete(key);
        if (this.isFinished) return;
        this.rollupHost(cacheData).catch(this.onError);
      }, delay);
    }
  }

  getRollupMeta(
    isHost: boolean,
    ref: DateLike,
    jobName: string,
    metric: StatsMetricType,
  ): RollupMeta[] {
    const rollupMeta: RollupMeta[] = [];

    CONFIG.units.forEach((unit) => {
      // skip the src
      if (unit === StatsGranularity.Minute) return;
      const key = isHost
        ? this.getHostKey(jobName, metric, unit)
        : this.getKey(jobName, metric, unit);

      const start = startOf(ref, unit);
      const end = endOf(start, unit);

      rollupMeta.push({
        key,
        start,
        end,
        isHost,
        unit,
      });
    });

    return rollupMeta;
  }

  private async getRollupValues(
    rollupMeta: RollupMeta[],
  ): Promise<StatisticalSnapshot[]> {
    const pipeline = this.client.pipeline();
    // get destination data
    rollupMeta.forEach((meta) => {
      const { key, start } = meta;
      TimeSeries.multi.get(pipeline, key, start);
    });

    const items = await deserializePipeline<StatisticalSnapshot>(
      pipeline,
      EmptyStatsSnapshot,
    );

    items.forEach((item, index) => {
      if (item) {
        const { start, end } = rollupMeta[index];
        if (!item.startTime) item.startTime = start.getTime();
        if (!item.endTime) item.endTime = end.getTime();
      }
    });
    return items;
  }

  private async rollupInternal(
    source: StatisticalSnapshot,
    jobName: string,
    metric: StatsMetricType,
    rollupMeta: RollupMeta[],
  ): Promise<void> {
    const response = await this.getRollupValues(rollupMeta);

    response.forEach((stat, index) => {
      const current = stat || EmptyStatsSnapshot;
      const meta = rollupMeta[index];
      meta.data = current;
      const { start, end, unit, isHost } = meta;
      current.endTime = end.getTime();
      const snapshot = aggregateSnapshots([source, current]);
      snapshot.startTime = start.getTime();
      snapshot.endTime = end.getTime();
      const options: StatsWriteOptions = {
        jobName,
        metric,
        unit,
        isHost,
      };

      this.writeSnapshot(snapshot, options);
    });
  }

  protected async rollupHost(cacheData: HostRollupMeta): Promise<void> {
    if (!cacheData) return;
    const { jobName, metric, start, host } = cacheData;
    const pipeline = host.client.pipeline();

    // get source data from all queues
    host.queueManagers.forEach(({ statsClient }) => {
      const srcKey = statsClient.getKey(
        jobName,
        metric,
        StatsGranularity.Minute,
      );
      TimeSeries.multi.get(pipeline, srcKey, start);
    });

    const end = endOf(start, 'minute').getTime();
    const sources = await deserializePipeline<StatisticalSnapshot>(
      pipeline,
      EmptyStatsSnapshot,
    );

    sources.forEach((item) => {
      if (item) {
        if (!item.startTime) item.startTime = start;
        if (!item.endTime) item.endTime = end;
      }
    });

    // not all of these will be available, so fixup with correct dates

    const source = aggregateSnapshots(sources);

    const meta = this.getRollupMeta(true, start, jobName, metric);

    return this.rollupInternal(source, jobName, metric, meta);
  }

  protected rollup(
    jobName: string,
    metric: StatsMetricType,
    source: StatisticalSnapshot,
  ): void {
    // only rollup events at lowest granularity
    const rollupMeta = this.getRollupMeta(
      false,
      source.startTime,
      jobName,
      metric,
    );

    this.rollupInternal(source, jobName, metric, rollupMeta).catch(
      this.onError,
    );
  }

  writeSnapshot(stats: StatisticalSnapshot, options: StatsWriteOptions): void {
    if (!this.hasLock) return;

    const {
      metric,
      jobName,
      unit = StatsGranularity.Minute,
      isHost = false,
    } = options;

    const key = isHost
      ? this.getHostKey(jobName, metric, unit)
      : this.getKey(jobName, metric, unit);

    const multi = this.writer.multi;

    const eventData = {
      jobName,
      metric,
      unit,
      stats,
    };
    const eventName = (isHost ? 'host.' : '') + `stats.${metric}.updated`;

    TimeSeries.multi.set(multi, key, stats.startTime, stats);
    this.bus.pipelineEmit(multi, eventName, eventData);
    const now = Date.now();

    if (!isHost && now - stats.startTime <= 60000) {
      this.updateWriteCursor(multi, jobName, metric, unit, now);
    }

    if (unit === StatsGranularity.Minute && !isHost) {
      this.rollup(jobName, metric, stats);
      this.cacheHostUpdate(jobName, metric, stats.startTime);
    }
  }

  public onStatsUpdate(
    isHost: boolean,
    metric: StatsMetricType,
    jobName: string,
    granularity: StatsGranularity,
    since?: DateLike,
  ): AsyncIterator<StatisticalSnapshot> {
    function filter(_, data: any): boolean {
      let good =
        data &&
        data.value &&
        (!data.jobName || data.jobName === jobName) &&
        (!data.unit || data.unit === granularity);

      if (good && !isNil(since)) {
        const ts = parseTimestamp(since, systemClock.getTime());
        good = data.ts && data.ts > ts;
      }
      return good;
    }

    function transform(_, data: any): StatisticalSnapshot {
      return JSON.parse(data.value) as StatisticalSnapshot;
    }

    const eventName = (isHost ? 'host.' : '') + `stats.${metric}.updated`;
    return this.bus.createAsyncIterator<any, StatisticalSnapshot>({
      eventNames: [eventName],
      filter,
      transform,
    });
  }

  /**
   * @private
   * @param snapshot
   * @param {String} jobName
   * @param {String} metric
   * @private
   */
  private _writeSnapshot(
    snapshot: StatisticalSnapshot,
    metric: StatsMetricType,
    jobName: string = null,
  ): void {
    const options: StatsWriteOptions = {
      jobName,
      metric,
    };

    this.writeSnapshot(snapshot, options);

    // todo: add COMPLETED and FAILED to queue, queue + jobtype, host
    this.updateCounts(snapshot, jobName);
  }

  writeStats(status: QueueStats, options?: StatisticalSnapshotOptions): void {
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
