import { aggregateHistograms as aggregate } from '../metrics/lib';
import { StatisticalSnapshot, StatsGranularity } from '../../types';

const CONFIG = {
  units: ['minutes', 'hours', 'days', 'weeks'],
  prevUnit: {
    hours: 'minutes',
    days: 'hours',
    weeks: 'days',
    months: 'weeks',
  },
};

export function getPrevUnit(unit: StatsGranularity): StatsGranularity {
  return CONFIG.prevUnit[unit];
}

const INT_FIELDS = new Set([
  'count',
  'failed',
  'completed',
  'startTime',
  'endTime',
  'waiting',
]);

const FLOAT_FIELDS = new Set([
  'mean',
  'stddev',
  'min',
  'max',
  'p50',
  'p75',
  'p90',
  'p95',
  'p99',
  'p995',
]);

export function formatSnapshot(
  val: Record<string, any>,
  includeData = true,
): Record<string, any> {
  if (!val) return val;
  Object.keys(val).forEach((key) => {
    const value = val[key];
    if (INT_FIELDS.has(key)) {
      val[key] = parseInt(value);
    } else if (FLOAT_FIELDS.has(key)) {
      val[key] = parseFloat(value);
    }
  });

  if (!includeData) {
    delete val.data;
  }
  return val;
}

export function aggregateHistograms(
  recs: StatisticalSnapshot[],
): StatisticalSnapshot {
  let completed = 0;
  let failed = 0;
  recs.forEach((rec) => {
    completed = completed + (rec.completed || 0);
    failed = failed + (rec.failed || 0);
  });

  const hist = aggregate(recs);
  return {
    ...hist,
    completed,
    failed,
  };
}
