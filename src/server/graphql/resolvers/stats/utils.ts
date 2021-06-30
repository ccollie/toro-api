import { getStatsClient, normalizeGranularity } from '../../helpers';
import { parseRange } from '@lib/datetime';
import {
  StatsMetricType,
  StatisticalSnapshot,
  StatsGranularity,
  MeterSummary,
  StatsRateType,
  TimeseriesDataPoint,
} from '@src/types';
import { StatsClient, StreamingPeakDetector } from '@server/stats';
import { HostManager } from '@server/hosts';
import { Queue } from 'bullmq';
import { ManualClock } from '@lib/clock';
import { PeakSignalDirection, PeakDataPoint } from '@server/graphql/typings';

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

export function detectPeaks(
  rawData: TimeseriesDataPoint[],
  lag = 0,
  threshold = 3.5,
  influence = 0.5,
): PeakDataPoint[] {
  const result: PeakDataPoint[] = [];
  const clock = new ManualClock();
  const detector = new StreamingPeakDetector(clock, lag, threshold, influence);

  if (rawData.length) {
    clock.set(rawData[0].ts);
    rawData.forEach(({ ts, value }) => {
      clock.set(ts);
      const signal = detector.update(value);
      if (signal !== 0) {
        const direction: PeakSignalDirection =
          signal === 1 ? PeakSignalDirection.Above : PeakSignalDirection.Below;
        result.push({
          ts,
          value,
          signal: direction,
        });
      }
    });
  }

  return result;
}
