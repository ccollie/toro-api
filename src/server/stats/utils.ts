import { aggregateHistograms as aggregate } from '../metrics/lib';
import { StatisticalSnapshot, StatsGranularity } from '../../types';
import { Pipeline } from 'ioredis';
import { checkMultiErrors } from '../redis';
import ms from 'ms';

export const CONFIG = {
  units: [
    StatsGranularity.Minute,
    StatsGranularity.Hour,
    StatsGranularity.Day,
    StatsGranularity.Week,
  ],
  prevUnit: {
    [StatsGranularity.Hour]: StatsGranularity.Minute,
    [StatsGranularity.Day]: StatsGranularity.Hour,
    [StatsGranularity.Week]: StatsGranularity.Day,
    [StatsGranularity.Month]: StatsGranularity.Week,
  },
  cronExpressions: ['* * * * *', '0 * * * *', '0 0 * * *', '0 0 * * 0'],
  retention: {
    [StatsGranularity.Minute]: 60 * 6,
    [StatsGranularity.Hour]: 24 * 7,
    [StatsGranularity.Day]: 7,
    [StatsGranularity.Week]: 4,
    [StatsGranularity.Month]: 1,
  },
  defaultRange: {
    [StatsGranularity.Minute]: 60,
    [StatsGranularity.Hour]: 24,
    [StatsGranularity.Day]: 7,
    [StatsGranularity.Week]: 4,
    [StatsGranularity.Month]: 6,
  },
  interval: {
    [StatsGranularity.Minute]: ms('1 min'),
    [StatsGranularity.Hour]: ms('1 hr'),
    [StatsGranularity.Day]: ms('1 day'),
    [StatsGranularity.Week]: ms('1 week'),
    [StatsGranularity.Month]: ms('1 month'),
  },
  snapshotInterval: ms(`1 ${StatsGranularity.Minute}`),
};

export function getPrevUnit(unit: StatsGranularity): StatsGranularity {
  return CONFIG.prevUnit[unit];
}

export function getSnapshotInterval(): number {
  return CONFIG.snapshotInterval;
}

export function getRetention(unit: StatsGranularity): number {
  return ms(`${CONFIG.retention[unit]} ${unit}`);
}

export function getDefaultRange(unit: StatsGranularity): number {
  return ms(`${CONFIG.defaultRange[unit]} ${unit}`);
}

export const DefaultPercentiles = [0.5, 0.9, 0.95, 0.99, 0.995];

export const EmptyStatsSnapshot: StatisticalSnapshot = {
  count: 0,
  mean: 0,
  min: 0,
  max: 0,
  stddev: 0,
  median: 0,
  p90: 0,
  p95: 0,
  p99: 0,
  p995: 0,
  data: null,
  completed: 0,
  failed: 0,
};

export function aggregateSnapshots(
  recs: StatisticalSnapshot[],
): StatisticalSnapshot {
  let completed = 0;
  let failed = 0;
  let startTime = recs.length ? recs[0].startTime : 0;
  let endTime = startTime;

  recs.forEach((rec) => {
    completed = completed + (rec.completed || 0);
    failed = failed + (rec.failed || 0);
    startTime = Math.min(startTime, rec.startTime);
    endTime = Math.max(endTime, rec.endTime);
  });

  const hist = aggregate(recs);
  return {
    ...hist,
    completed,
    failed,
    startTime,
    endTime,
  };
}
