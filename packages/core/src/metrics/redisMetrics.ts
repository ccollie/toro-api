import { PollingMetric } from './baseMetric';
import { getRedisInfoByQueue } from '../loaders/redis-info';
import { RedisMetrics } from '../redis/utils';
import {
  MetricCategory,
  MetricValueType,
  MetricTypes,
  MetricOptions,
} from '../types';
import { Pipeline } from 'ioredis';
import { Queue } from 'bullmq';

type TKey = keyof RedisMetrics;

export class RedisMetric extends PollingMetric {
  private readonly fieldName: TKey;

  constructor(options: MetricOptions, fieldName: TKey) {
    super(options);
    this.fieldName = fieldName;
  }

  async checkUpdate(
    pipeline: Pipeline,
    queue: Queue,
    ts?: number,
  ): Promise<void> {
    const info = await getRedisInfoByQueue(queue);
    const val = info[this.fieldName];
    const value = typeof val === 'string' ? parseInt(val, 10) : val;
    this.update(value, ts);
  }

  get validEvents(): string[] {
    return [];
  }

  static get category(): MetricCategory {
    return MetricCategory.Redis;
  }

  static get type(): MetricValueType {
    return MetricValueType.Gauge;
  }
}

export class UsedMemoryMetric extends RedisMetric {
  constructor(options: MetricOptions) {
    super(options, 'used_memory_rss');
  }

  static get key(): MetricTypes {
    return MetricTypes.UsedMemory;
  }

  static get description(): string {
    return 'Used Memory';
  }

  static get unit(): string {
    return 'bytes';
  }
}

export class ConnectedClientsMetric extends RedisMetric {
  constructor(options: MetricOptions) {
    super(options, 'connected_clients');
  }

  static get key(): MetricTypes {
    return MetricTypes.ConnectedClients;
  }

  static get description(): string {
    return 'Connected Clients';
  }

  static get unit(): string {
    return 'connections';
  }
}

export class PeakMemoryMetric extends RedisMetric {
  constructor(options: MetricOptions) {
    super(options, 'used_memory_peak');
  }

  static get key(): MetricTypes {
    return MetricTypes.PeakMemory;
  }

  static get description(): string {
    return 'Redis Peak Memory';
  }

  static get unit(): string {
    return 'bytes';
  }
}

export class FragmentationRatioMetric extends RedisMetric {
  constructor(options: MetricOptions) {
    super(options, 'mem_fragmentation_ratio');
  }

  static get key(): MetricTypes {
    return MetricTypes.FragmentationRatio;
  }

  static get description(): string {
    return 'Memory Fragmentation Ratio';
  }

  static get unit(): string {
    return '';
  }
}

export class InstantaneousOpsMetric extends RedisMetric {
  constructor(options: MetricOptions) {
    super(options, 'instantaneous_ops_per_sec');
  }

  static get key(): MetricTypes {
    return MetricTypes.InstantaneousOps;
  }

  static get description(): string {
    return 'Redis Operations';
  }

  static get unit(): string {
    return 'ops/sec';
  }
}
