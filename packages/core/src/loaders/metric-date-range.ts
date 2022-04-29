import { Queue, RedisClient } from 'bullmq';
import pMap from 'p-map';
import DataLoader from 'dataloader';
import { Metric } from '../metrics';
import { getMetricsDataKey } from '../keys';
import { Timespan } from '../types';
import { logger } from '../logger';
import { TimeSeries } from '../commands';
import { getQueueHostClient, getQueueById, getQueueManager } from './accessors';
import { QueueIdTagKey } from '../metrics';

function getDataKey(queue: Queue, metric: Metric): string {
  return getMetricsDataKey('', queue, metric.id);
}

async function getSingle(metric: Metric): Promise<Timespan> {
  const qid = metric.getTagValue(QueueIdTagKey);
  const queue = getQueueManager(qid);
  const metrics = queue.metricsManager;
  return metrics.getMetricDateRange(metric);
}

type QueryMeta = {
  index: number;
  key: string;
};

async function getRangeBatch(metrics: Metric[]): Promise<Timespan[]> {
  if (metrics.length === 1) {
    const span = await getSingle(metrics[0]);
    return [span];
  }

  const result: Timespan[] = new Array<Timespan>(metrics.length);
  const metaMap = new Map<Metric, QueryMeta>();
  const hostMetrics = new Map<RedisClient, Metric[]>();

  metrics.forEach((metric, index) => {
    const qid = metric.getTagValue(QueueIdTagKey);
    const queue = getQueueById(qid);
    const client = getQueueHostClient(queue);
    let metricsThisHost = hostMetrics.get(client);
    if (!metricsThisHost) {
      metricsThisHost = [];
      hostMetrics.set(client, metricsThisHost);
    }
    metricsThisHost.push(metric);
    const meta: QueryMeta = {
      index,
      key: getDataKey(queue, metric),
    };
    metaMap.set(metric, meta);
  });

  await pMap(hostMetrics, async ([client, metrics]) => {
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

export const metricDateRange = new DataLoader(getRangeBatch, {
  cacheKeyFn: (x) => x.id,
});
