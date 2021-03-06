import { getStatsClient, normalizeGranularity } from '../../helpers';
import { parseRange } from '@lib/datetime';
import {
  StatsMetricType,
  StatisticalSnapshot,
  StatsGranularity,
  MeterSummary,
  StatsRateType,
} from '@src/types';
import { StatsClient } from '@server/stats';
import { HostManager } from '@server/hosts';
import { Queue } from 'bullmq';

export function getClient(model: Queue | HostManager): StatsClient {
  if (model instanceof HostManager) {
    const host = model as HostManager;
    const manager = host.queueManagers[0];
    return manager.statsClient;
  } else {
    // it's a queue
    return getStatsClient(model as Queue);
  }
}

export async function getStats(
  model: Queue | HostManager,
  jobName: string,
  range: string,
  metric: StatsMetricType,
  granularity: StatsGranularity,
): Promise<StatisticalSnapshot[]> {
  const client = getClient(model);
  const unit = normalizeGranularity(granularity);

  const { startTime, endTime } = parseRange(range);
  if (model instanceof HostManager) {
    return client.getHostStats(jobName, metric, unit, startTime, endTime);
  } else {
    return client.getStats(jobName, metric, unit, startTime, endTime);
  }
}

export async function aggregateStats(
  model: Queue | HostManager,
  jobName: string,
  range: string,
  metric: StatsMetricType,
  granularity: StatsGranularity,
): Promise<StatisticalSnapshot> {
  const client = getClient(model);
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
  model: Queue | HostManager,
  jobName: string,
  range: string,
  granularity: StatsGranularity,
  type: StatsRateType,
): Promise<MeterSummary> {
  const client = getClient(model);

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
