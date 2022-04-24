import {
  HostManager,
  MeterSummary,
  MetricManager,
  StatisticalSnapshot,
  StatsClient,
  StatsGranularity,
  StatsMetricType,
  StatsRateType,
} from '@alpen/core';
import { parseRange } from '@alpen/shared';
import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';

export function normalizeGranularity(granularity: string): StatsGranularity {
  return (
    granularity ? granularity.toLowerCase() : granularity
  ) as StatsGranularity;
}

export function getClient(
  context: EZContext,
  model: Queue | HostManager,
): StatsClient {
  if (model instanceof HostManager) {
    const host = model as HostManager;
    const manager = host.queueManagers[0];
    return manager.statsClient;
  } else {
    // it's a queue
    return context.accessors.getStatsClient(model as Queue);
  }
}

export function getMetricsManager(
  context: EZContext,
  queue: Queue,
): MetricManager {
  const mgr = context.accessors.getQueueManager(queue);
  return mgr.metricManager;
}

export async function getStats(
  context: EZContext,
  model: Queue | HostManager,
  jobName: string,
  range: string,
  metric: StatsMetricType,
  granularity: StatsGranularity,
): Promise<StatisticalSnapshot[]> {
  const client = getClient(context, model);
  const unit = normalizeGranularity(granularity);

  const { startTime, endTime } = parseRange(range);
  if (model instanceof HostManager) {
    return client.getHostStats(jobName, metric, unit, startTime, endTime);
  } else {
    return client.getStats(jobName, metric, unit, startTime, endTime);
  }
}

export async function aggregateStats(
  context: EZContext,
  model: Queue | HostManager,
  jobName: string,
  range: string,
  metric: StatsMetricType,
  granularity: StatsGranularity,
): Promise<StatisticalSnapshot> {
  const client = getClient(context, model);
  let snapshot: StatisticalSnapshot;

  const unit = normalizeGranularity(granularity);
  const { startTime, endTime } = parseRange(range);

  if (model instanceof HostManager) {
    snapshot = await client.getAggregateHostStats(
      jobName,
      metric,
      unit,
      startTime,
      endTime,
    );
  } else {
    snapshot = await client.getAggregateStats(
      jobName,
      metric,
      unit,
      startTime,
      endTime,
    );
  }

  return snapshot;
}

export async function aggregateRates(
  context: EZContext,
  model: Queue | HostManager,
  jobName: string,
  range: string,
  granularity: StatsGranularity,
  type: StatsRateType,
): Promise<MeterSummary> {
  const client = getClient(context, model);

  const unit = normalizeGranularity(granularity);
  const { startTime, endTime } = parseRange(range);

  if (model instanceof HostManager) {
    return client.getHostAggregateRates(
      jobName,
      unit,
      type,
      startTime,
      endTime,
    );
  } else {
    return client.getAggregateRates(jobName, unit, type, startTime, endTime);
  }
}
