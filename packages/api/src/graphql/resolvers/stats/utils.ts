import {
  StatsSnapshot,
  HostManager,
  Metric,
  MetricManager,
  MetricName,
  MetricGranularity
} from '@alpen/core';
import { DateLike } from '@alpen/shared';
import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';

export type MetricLike = Metric | MetricName | string;

export function normalizeGranularity(granularity: string): MetricGranularity {
  return (
    granularity ? granularity.toLowerCase() : granularity
  ) as MetricGranularity;
}

export function getMetricName(m: MetricLike): MetricName {
  if (typeof m === 'string') {
    return MetricName.fromCanonicalName(m);
  }
  if (m instanceof Metric) {
    return m.name;
  }
  return m;
}

export function getMetricManagerFromMetric(
  context: EZContext,
  metric: MetricLike,
): MetricManager | null {
  const mn = getMetricName(metric);
  const queueId = mn.getTagValue('queue');
  const hostId = mn.getTagValue('host');
  const queue = context.accessors.getQueueManager(queueId);
  if (queue) return queue.metricsManager;
  const host = context.accessors.getHost(hostId);
  if (host) return host.metricsManager;
  throw new Error('Invalid metric');
}

export function getMetricManager(
  context: EZContext,
  model: Queue | HostManager,
): MetricManager {
  if (model instanceof HostManager) {
    const host = model as HostManager;
    return host.metricsManager;
  } else {
    const qm = context.accessors.getQueueManager(model);
    return qm.metricsManager;
  }
}

export async function getStats(
  context: EZContext,
  model: Queue | HostManager,
  metric: MetricLike,
  granularity: MetricGranularity,
  start: DateLike,
  end: DateLike,
): Promise<StatsSnapshot> {
  const unit = normalizeGranularity(granularity);
  const manager = getMetricManager(context, model);
  return manager.getStats(metric, unit, start, end);
}
