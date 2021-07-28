import { BaseMetric, logger, TimeSeries, Timespan } from '@alpen/core';
import { HostManager, getMetricsDataKey } from '@alpen/core';
import { getQueueById, getQueueHostManager, getQueueManager } from '../helpers';
import { Queue } from 'bullmq';
import pMap from 'p-map';
import { RegisterFn } from './types';
import DataLoader from 'dataloader';
import { DataLoaderRegistry } from './registry';

function getDataKey(queue: Queue, metric: BaseMetric): string {
  return getMetricsDataKey(queue, metric.id);
}

async function getSingle(metric: BaseMetric): Promise<Timespan> {
  const queue = getQueueManager(metric.queueId);
  const metrics = queue.metricManager;
  return metrics.getMetricDateRange(metric);
}

type QueryMeta = {
  index: number;
  key: string;
};

async function getRangeBatch(metrics: BaseMetric[]): Promise<Timespan[]> {
  if (metrics.length === 1) {
    const span = await getSingle(metrics[0]);
    return [span];
  }

  const result: Timespan[] = new Array<Timespan>(metrics.length);
  const metaMap = new Map<BaseMetric, QueryMeta>();
  const hostMetrics = new Map<HostManager, BaseMetric[]>();

  metrics.forEach((metric, index) => {
    const queue = getQueueById(metric.queueId);
    const host = getQueueHostManager(queue);
    let metricsThisHost = hostMetrics.get(host);
    if (!metricsThisHost) {
      metricsThisHost = [];
      hostMetrics.set(host, metricsThisHost);
    }
    metricsThisHost.push(metric);
    const meta: QueryMeta = {
      index,
      key: getDataKey(queue, metric),
    };
    metaMap.set(metric, meta);
  });

  await pMap(hostMetrics, async ([host, metrics]) => {
    const client = host.client;
    const pipeline = client.pipeline();

    metrics.forEach((metric) => {
      const meta = metaMap.get(metric);
      TimeSeries.multi.getSpan(pipeline, meta.key);
    });

    const response = await pipeline.exec();

    metrics.forEach((metric, index) => {
      const meta = metaMap.get(metric);
      const [err, span] = response[index];
      if (err) {
        logger.error(err);
      }
      if (span) {
        const [start, end] = span;
        result[meta.index] = {
          startTime: parseInt(start),
          endTime: parseInt(end),
        };
      }
    });
  });
  return result;
}

const LOADER_NAME = 'metricDateRange';

export default function registerLoaders(register: RegisterFn): void {
  const factory = () =>
    new DataLoader(getRangeBatch, {
      cacheKeyFn: (x) => x.id,
    });

  register('metricDateRange', factory);
}

export function getMetricDateRange(
  loaders: DataLoaderRegistry,
  metric: BaseMetric,
): Promise<Timespan> {
  const loader = loaders.getLoader<BaseMetric, Timespan, string>(LOADER_NAME);
  return loader.load(metric);
}
