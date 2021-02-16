import { getStatsClient, normalizeGranularity } from '../../helpers';
import { parseRange } from '../../../lib/datetime';
import {
  StatsMetricType,
  StatisticalSnapshot,
  StatsGranularity,
  MeterSummary,
  StatsRateType,
} from '../../../../types';
import { StatsClient } from '../../../stats';
import { HostManager } from '../../../hosts';
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

  const { start, end } = parseRange(range);
  if (model instanceof HostManager) {
    return client.getHostStats(jobName, metric, unit, start, end);
  } else {
    return client.getStats(jobName, metric, unit, start, end);
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
  const { start, end } = parseRange(range);

  if (model instanceof HostManager) {
    snapshot = await client.getAggregateHostStats(
      jobName,
      metric,
      unit,
      start,
      end,
    );
  } else {
    snapshot = await client.getAggregateStats(
      jobName,
      metric,
      unit,
      start,
      end,
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
  const { start, end } = parseRange(range);

  if (model instanceof HostManager) {
    return client.getHostAggregateRates(jobName, unit, type, start, end);
  } else {
    return client.getAggregateRates(jobName, unit, type, start, end);
  }
}
