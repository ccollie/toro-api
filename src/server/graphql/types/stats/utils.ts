import { getStatsClient, normalizeGranularity } from '../../helpers';
import { parseRange } from '../../../lib/datetime';
import {
  StatsMetricType,
  StatisticalSnapshot,
  StatsGranularity,
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
    snapshot = await client.aggregateHostStats(
      jobName,
      metric,
      unit,
      start,
      end,
    );
  } else {
    snapshot = await client.aggregateStats(jobName, metric, unit, start, end);
  }

  return snapshot;
}
