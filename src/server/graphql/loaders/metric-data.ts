import { BaseMetric } from '@server/metrics';
import { TimeseriesDataPoint } from '@src/types';
import {
  getQueueById,
  getQueueHostManager,
  getQueueManager,
} from '@server/graphql/helpers';
import { HostManager } from '@server/hosts';
import pMap from 'p-map';
import { RegisterFn } from './types';
import DataLoader from 'dataloader';
import { DataLoaderRegistry } from './registry';
import { logger } from '@server/lib';
import { MetricManager } from '@server/metrics/metric-manager';
import { DateLike } from '@lib/datetime';

export interface MetricDataLoaderKey {
  metric: BaseMetric;
  start?: DateLike;
  end?: DateLike;
  limit?: number;
}

function getCacheKey(key: MetricDataLoaderKey): string {
  const { metric, start = 0, end = 0, limit = 0 } = key;
  return `${metric.id}-${start}-${end}-${limit}`;
}

function getMetricManager(metric: BaseMetric): MetricManager {
  const queue = getQueueManager(metric.queueId);
  return queue.metricManager;
}

async function getSingle(
  key: MetricDataLoaderKey,
): Promise<TimeseriesDataPoint[]> {
  const { metric, start, end, limit } = key;
  const metrics = getMetricManager(metric);
  return metrics.getMetricData(metric, start, end, limit);
}

type QueryMeta = {
  index: number;
  args: MetricDataLoaderKey;
};

function parseResult(res: [Error | null, any[]]): TimeseriesDataPoint[] {
  const [err, data] = res;
  if (err) {
    logger.error(err);
    return [];
  }
  return data.map(([timestamp, value]) => ({
    ts: parseInt(timestamp),
    value: parseFloat(value),
  }));
}

async function getDataBatch(
  keys: MetricDataLoaderKey[],
): Promise<TimeseriesDataPoint[][]> {
  if (keys.length === 1) {
    const data = await getSingle(keys[0]);
    return [data];
  }

  const result = new Array<TimeseriesDataPoint[]>(keys.length);
  const hostMetrics = new Map<HostManager, QueryMeta[]>();

  keys.forEach((key, index) => {
    const { metric } = key;
    const queue = getQueueById(metric.queueId);
    const host = getQueueHostManager(queue);
    let metricsThisHost = hostMetrics.get(host);
    if (!metricsThisHost) {
      metricsThisHost = [];
      hostMetrics.set(host, metricsThisHost);
    }
    const meta: QueryMeta = {
      index,
      args: key,
    };
    metricsThisHost.push(meta);
  });

  await pMap(hostMetrics, async ([host, metas]) => {
    const client = host.client;
    const pipeline = client.pipeline();

    metas.forEach((meta) => {
      const { args } = meta;
      const { metric, start, end, limit } = args;
      const manager = getMetricManager(metric);
      manager.pipelineGetMetricData(pipeline, metric, start, end, limit);
    });

    const response = await pipeline.exec();

    metas.forEach((meta, index) => {
      result[meta.index] = parseResult(response[index]);
    });
  });
  return result;
}

const LOADER_NAME = 'metricData';

export default function registerLoaders(register: RegisterFn): void {
  const factory = () =>
    new DataLoader(getDataBatch, {
      cacheKeyFn: getCacheKey,
    });

  register(LOADER_NAME, factory);
}

export function getMetricData(
  loaders: DataLoaderRegistry,
  metric: BaseMetric,
  start?: DateLike,
  end?: DateLike,
  limit?: number,
): Promise<TimeseriesDataPoint[]> {
  const loader = loaders.getLoader<
    MetricDataLoaderKey,
    TimeseriesDataPoint[],
    string
  >(LOADER_NAME);
  const key: MetricDataLoaderKey = {
    metric,
    start,
    end,
    limit,
  };
  return loader.load(key);
}
