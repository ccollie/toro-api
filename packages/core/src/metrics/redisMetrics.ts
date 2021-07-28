import { PollingMetric } from './baseMetric';
import { getRedisInfo } from '../redis';
import { MetricsListener } from './metrics-listener';
import {
  MetricCategory,
  MetricValueType,
  MetricTypes,
  MetricOptions,
} from './types';

export class RedisMetric extends PollingMetric {
  private readonly fieldName: string;

  constructor(options: MetricOptions, fieldName: string) {
    super(options);
    this.fieldName = fieldName;
  }

  async checkUpdate(listener: MetricsListener, ts: number): Promise<void> {
    const client = await listener.client;
    const info = await getRedisInfo(client);
    const value = (info as any)[this.fieldName];
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
