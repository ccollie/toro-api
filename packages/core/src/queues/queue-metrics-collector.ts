import { DateLike, endOf, startOf, subtract as subtractDate } from '@alpen/shared';
import { DDSketch } from '@datadog/sketches-js';
import { Queue } from 'bullmq';
import { Pipeline } from 'ioredis';
import { systemClock } from '../lib';
import { getJobTypes } from './queue';
import { Scripts } from '../commands/scripts';
import { HostManager } from '../hosts';
import { getStatsKey } from '../keys';
import { round } from '@alpen/shared';
import { CONFIG, StatsGranularity, StatsMetricType } from '../stats';


export type TMetrics = {
  timestamp: number;
  count: number;
  sum?: number;
  min?: number;
  max?: number;
  p50?: number;
  p75?: number;
  p95?: number;
  p99?: number;
};

type RollupMeta = {
  key: string;
  unit: StatsGranularity;
  start: number;
  end: number;
};

async function updateDurationSketchRaw(
  queue: Queue,
  runtimeSketch: DDSketch,
  waitTimeSketch: DDSketch,
  start: number,
  end: number,
): Promise<void> {
  const { processingTime, waitTime } = await Scripts.getJobDurationValues(
    queue,
    start,
    end,
  );
  for (let i = 0; i < processingTime.length; i++) {
    const runtime = processingTime[i];
    const wait = waitTime[i];
    if (runtime !== -1) {
      runtimeSketch.accept(runtime);
    }
    if (wait !== -1) {
      waitTimeSketch.accept(wait);
    }
  }
}

function deserializeSketch(buf: Buffer): DDSketch | null {
  if (!buf || buf.length === 0) {
    return null;
  }
  // todo: compress based on a threshold
  return DDSketch.fromProto(buf);
}

function serializeSketch(sketch: DDSketch | null): Uint8Array | null {
  if (!sketch) {
    return null;
  }
  return sketch.toProto();
}

export function convertSketchToMetrics(sketch: DDSketch, ts: number): TMetrics {
  const { count, sum, min, max } = sketch;
  const p50 = round(sketch.getValueAtQuantile(0.5), 2);
  const p75 = round(sketch.getValueAtQuantile(0.75), 2);
  const p95 = round(sketch.getValueAtQuantile(0.95), 2);
  const p99 = round(sketch.getValueAtQuantile(0.99), 2);

  return {
    timestamp: ts,
    count,
    sum,
    min,
    max,
    p50,
    p75,
    p95,
    p99,
  };
}


export class QueueMetricsCollector {
  private _pipeline: Pipeline;

  constructor(
    private _host: HostManager,
    private _queue: Queue,
  ) {

  }

  public async getSketchRange(
    metric: StatsMetricType,
    start = 0,
    end = -1,
    granularity: StatsGranularity = StatsGranularity.Hour,
  ): Promise<Map<number, DDSketch>> {
    start = startOf(start, granularity).getTime();
    if (end !== -1) {
      end = endOf(end, granularity).getTime();
    }
    const key = this.getKey(null, metric, granularity);
    const client = this._redisClient;
    const res = await client.zrangebyscoreBuffer(key, start, end, 'WITHSCORES');
    const map = new Map<number, DDSketch>();
    // we have [[value, timestamp], [value, timestamp], ...]
    for (let i = 0; i < res.length; i += 2) {
      const ts = parseInt(res[i + 1].toString(), 10);
      if (Number.isNaN(ts)) {
        continue;
      }
      const sketch = deserializeSketch(res[i]);
      if (sketch) {
        map.set(ts, sketch);
      }
    }
    return map;
  }

  async getSketch(
    metric: StatsMetricType,
    timestamp = 0,
    granularity: StatsGranularity = StatsGranularity.Hour,
  ): Promise<DDSketch> {
    const start = startOf(timestamp, granularity).getTime();
    const map = await this.getSketchRange(metric, start, start, granularity);
    const items = Array.from(map.values());
    return items.length > 0 ? items[0] : new DDSketch();
  }

  private _clear(jobName: string) {
    const pipeline = this.pipeline;
    let metas = this.getRollupMeta(0, jobName, 'latency');
    const keys = metas.map((meta) => meta.key);
    metas = this.getRollupMeta(0, jobName, 'wait');
    keys.push(...metas.map(x => x.key));
    pipeline.del(...keys);
  }

  async clear(jobName?: string): Promise<void> {
    if (jobName) {
      this._clear(jobName);
    } else {
      const jobNames = await getJobTypes(this._host.name, this._queue);
      jobNames.push('');
      jobNames.forEach((jobName) => {
        this._clear(jobName);
      });
    }
    await this.flushPipeline();
  }

  async update(ts?: number): Promise<void> {
    const timestamp = ts ?? systemClock.getTime();
    //
    const start = startOf(timestamp, StatsGranularity.Minute).getTime();
    const end = endOf(timestamp, StatsGranularity.Minute).getTime();
    const runtime = new DDSketch();
    const waitTime = new DDSketch();

    await updateDurationSketchRaw(this._queue, runtime, waitTime, start, end);
    // todo: Promise.all
    await this.addSketch('latency', runtime, start);
    await this.addSketch('wait', waitTime, start);
  }

  async aggregate(
    metric: StatsMetricType,
    start: number,
    end: number,
    granularity: StatsGranularity,
  ): Promise<DDSketch> {
    const map = await this.getSketchRange(metric, start, end, granularity);

    const result = new DDSketch();
    map.forEach((sketch, ts) => {
      result.merge(sketch);
      // eslint-disable-next-line max-len
      // https://github.com/DataDog/sketches-js/pull/18/commits/10624f0a0b2de832c407d7145688c191d738c8f2
      result.zeroCount += sketch.zeroCount;
    });

    return result;
  }

  async getAggregateMetrics(
    metric: StatsMetricType,
    start: number,
    end: number,
    granularity: StatsGranularity,
  ): Promise<TMetrics> {
    const sketch = await this.aggregate(metric, start, end, granularity);
    return convertSketchToMetrics(sketch, start);
  }

  // write minute stats
  async addSketch(
    metric: StatsMetricType,
    stats: DDSketch,
    start: Date | number,
    jobName?: string) {
    await this._storeSketch(stats, metric, jobName || null, start, StatsGranularity.Minute);
    await this.flushPipeline();
  }

  protected async _storeSketch(
    stats: DDSketch,
    metric: StatsMetricType,
    jobName: string | null,
    start: Date | number,
    unit: StatsGranularity): Promise<void> {

    const key = this.getKey(jobName, metric, unit);

    let time = typeof start === 'number' ? start : start.getTime();
    // round to unit
    time = startOf(time, unit).getTime();
    (this.pipeline as any).zaddBuffer(key, time, serializeSketch(stats));

    if (unit === StatsGranularity.Minute) {
      await this.rollup(jobName, metric, stats, time);
    }
  }

  protected async rollup(
    jobName: string,
    metric: StatsMetricType,
    source: DDSketch,
    timestamp: number = Date.now(),
  ): Promise<void> {
    // only rollup events at lowest granularity
    const rollupMeta = this.getRollupMeta(
      timestamp,
      jobName,
      metric,
    );

    await this.rollupInternal(source, metric, jobName, rollupMeta);
  }

  private async getRollupValues(
    rollupMeta: RollupMeta[],
  ): Promise<Array<DDSketch | null>> {
    const client = this._redisClient;
    const pipeline = client.pipeline();
    // get destination data
    rollupMeta.forEach((meta) => {
      const { key, start } = meta;
      (pipeline as any).zrangebyscoreBuffer(key, start, start);
    });

    const res = await pipeline.exec();
    const result = [];
    res.forEach((item) => {
      if (item[1]) {
        const buf = item[1][0];
        if (Buffer.isBuffer(buf)) {
          const sketch = deserializeSketch(buf);
          result.push(sketch);
        }
      } else {
        result.push(null);
      }
    });

    return result;
  }

  private async rollupInternal(
    source: DDSketch,
    metric: StatsMetricType,
    jobName: string,
    rollupMeta: RollupMeta[],
  ): Promise<void> {
    const response = await this.getRollupValues(rollupMeta);

    response.forEach(async (current, index) => {
      const meta = rollupMeta[index];
      const { start, unit } = meta;
      let sketch: DDSketch;
      if (current) {
        current.merge(source);
        // eslint-disable-next-line max-len
        // https://github.com/DataDog/sketches-js/pull/18/commits/10624f0a0b2de832c407d7145688c191d738c8f2
        sketch = current;
        sketch.zeroCount += source.zeroCount;
      } else {
        sketch = source;
      }

      await this._storeSketch(sketch, metric, jobName || null, start, unit);
    });
  }

  private getRollupMeta(
    ref: DateLike,
    jobName: string,
    metric: StatsMetricType,
  ): RollupMeta[] {
    const rollupMeta: RollupMeta[] = [];

    CONFIG.units.forEach((unit) => {
      // skip the src
      if (unit === StatsGranularity.Minute) return;

      const start = startOf(ref, unit).getTime();
      const end = endOf(start, unit).getTime();
      const key = this.getKey(jobName, metric, unit);

      rollupMeta.push({
        key,
        start,
        end,
        unit,
      });
    });

    return rollupMeta;
  }

  private getKey(
    jobName: string,
    metric: StatsMetricType,
    unit?: StatsGranularity,
  ): string {
    return getStatsKey(this._queue, jobName, metric, unit);
  }

  async pruneData(): Promise<void> {
    const pipeline = this.pipeline;
    const now = Date.now();

    const remove = (unit: StatsGranularity, jobName?: string) => {
      const retention = CONFIG.retention[unit];
      const end = startOf(subtractDate(now, retention, unit), unit).getTime() - 1;
      let key = this.getKey(jobName, 'latency', unit);
      pipeline.zremrangebyscore(key, '-inf', end);
      key = this.getKey(jobName, 'wait', unit);
      pipeline.zremrangebyscore(key, '-inf', end);
    };

    CONFIG.units.forEach((unit) => {
      // todo: jobNames
      remove(unit);
    });

    await this.flushPipeline();
  }

  private async getLastTimestamp(metric: StatsMetricType): Promise<number> {
    const client = this._redisClient;
    const key = this.getKey(null, metric, StatsGranularity.Minute);
    const res = await client.zrange(key, -1, -1, 'WITHSCORES');
    if (res.length === 0) {
      return 0;
    }
    const score = parseInt(res[1], 10);
    return Number.isInteger(score) ? score : 0;
  }

  private get _redisClient() {
    return this._host.client;
  }

  private get pipeline() {
    if (!this._pipeline) {
      this._pipeline = this._redisClient.pipeline();
    }
    return this._pipeline;
  }

  private async flushPipeline() {
    if (this._pipeline) {
      await this._pipeline.exec();
      this._pipeline = null;
    }
  }
}
