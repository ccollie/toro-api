import pMap from 'p-map';
import DataLoader from 'dataloader';
import { DateLike } from '@alpen/shared';
import { BaseMetric, MetricManager } from '../metrics';
import {
  filterOutlierObjects,
  OutlierMethod,
  TimeseriesDataPoint,
} from '../stats';
import { logger } from '../logger';
import { getQueueById, getQueueHostClient, getQueueManager } from './accessors';
import { RedisClient } from 'bullmq';

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
    logger.eror(err);
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
  const hostMetrics = new Map<RedisClient, QueryMeta[]>();

  keys.forEach((key, index) => {
    const { metric } = key;
    const queue = getQueueById(metric.queueId);
    const client = getQueueHostClient(queue);
    let metricsThisHost = hostMetrics.get(client);
    if (!metricsThisHost) {
      metricsThisHost = [];
      hostMetrics.set(client, metricsThisHost);
    }
    const meta: QueryMeta = {
      index,
      args: key,
    };
    metricsThisHost.push(meta);
  });

  await pMap(hostMetrics, async ([client, metas]) => {
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

export const metricData = new DataLoader(getDataBatch, {
  cacheKeyFn: getCacheKey,
});

export function getMetricData(
  metric: BaseMetric,
  start?: DateLike,
  end?: DateLike,
  limit?: number,
): Promise<TimeseriesDataPoint[]> {
  const key: MetricDataLoaderKey = {
    metric,
    start,
    end,
    limit,
  };
  return metricData.load(key);
}

export async function getFilteredMetricData(
  options: MetricDataLoaderKey,
  outlierFilter?: {
    method: OutlierMethod;
    threshold?: number;
  },
): Promise<TimeseriesDataPoint[]> {
  const { metric, start, end, limit } = options;
  const data = await getMetricData(metric, start, end, limit);
  if (outlierFilter) {
    const { method, threshold } = outlierFilter;
    return filterOutlierObjects(method, data, (x) => x.value, { threshold });
  }
  return data;
}
