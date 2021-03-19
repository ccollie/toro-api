import { PollingMetric } from './baseMetric';
import { getRedisInfo } from '../redis';
import IORedis from 'ioredis';
import { MetricsListener } from './metricsListener';
import {
  MetricType,
  MetricCategory,
  PollingMetricOptions,
} from '../../types/metrics';

export class RedisMetric extends PollingMetric {
  private client: Promise<IORedis.Redis>;
  private readonly fieldName: string;

  constructor(options: PollingMetricOptions, fieldName: string) {
    super(options);
    this.fieldName = fieldName;
  }

  get interval(): number {
    return (this.options as PollingMetricOptions).interval;
  }

  async checkUpdate(): Promise<void> {
    if (this.client) {
      const client = await this.client;
      const info = await getRedisInfo(client);
      const value = (info as any)[this.fieldName];
      this.update(value);
    }
  }

  init(listener: MetricsListener): void {
    super.init(listener);
    this.client = listener.client;
  }

  get validEvents(): string[] {
    return [];
  }

  static get category(): MetricCategory {
    return MetricCategory.Redis;
  }

  static get type(): MetricType {
    return MetricType.Gauge;
  }
}

export class UsedMemoryMetric extends RedisMetric {
  constructor(options: PollingMetricOptions) {
    super(options, 'used_memory_rss');
  }

  static get key(): string {
    return 'used_memory';
  }

  static get description(): string {
    return 'Used Memory';
  }

  static get unit(): string {
    return 'bytes';
  }
}

export class ConnectedClientsMetric extends RedisMetric {
  constructor(options: PollingMetricOptions) {
    super(options, 'connected_clients');
  }

  static get key(): string {
    return 'connected_clients';
  }

  static get description(): string {
    return 'Connected Clients';
  }

  static get unit(): string {
    return 'connections';
  }
}
