import {
  build,
  decodeFromCompressedBase64,
  encodeIntoCompressedBase64,
  Histogram,
  initWebAssemblySync,
} from 'hdr-histogram-js';
import ms from 'ms';
import * as units from './units';
import { ManualClock } from '../lib';
import { Meter, type MeterSummary } from './meter';
import { HistogramSnapshot, StatsGranularity, StatsRateType } from './types';
import type { StatisticalSnapshot } from './timer';
import {DDSketch} from "@datadog/sketches-js";

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
  m15Rate: 0,
  m1Rate: 0,
  m5Rate: 0,
  meanRate: 0,
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

const emptyHistogramSnapshot: HistogramSnapshot = {
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
};

let wasmLoaded = false;

function ensureWasmLoaded(): void {
  if (!wasmLoaded) {
    wasmLoaded = true;
    initWebAssemblySync();
  }
}

export function createSketch(): DDSketch {
  return new DDSketch();
}

export function createHistogram(packed = true): Histogram {
  ensureWasmLoaded();
  // this.histogram = new Histogram(1, MAX_DURATION_IN_MS, 2);
  return build({
    numberOfSignificantValueDigits: 2,
    bitBucketSize: packed ? 'packed' : 32,
    autoResize: true,
    // useWebAssembly: true,
    useWebAssembly: false,
  });
}

export function encodeHistogram(hist: Histogram): string {
  ensureWasmLoaded();
  return encodeIntoCompressedBase64(hist);
}

export function decodeHistogram(value: string): Histogram {
  ensureWasmLoaded();
  return decodeFromCompressedBase64(value, 'packed', true);
}

function getMin(hist: Histogram): number {
  const result = hist.minNonZeroValue;
  return result === Number.MAX_SAFE_INTEGER ? 0 : result;
}

function getMax(hist: Histogram): number {
  const result = hist.maxValue;
  return result === Number.MIN_SAFE_INTEGER ? 0 : result;
}

export function getHistogramSnapshot(hist: Histogram): HistogramSnapshot {
  const count = hist.totalCount;
  const mean = Math.ceil(hist.mean * 100) / 100;
  const median = Math.ceil(hist.getValueAtPercentile(0.5) * 100) / 100;

  const result: HistogramSnapshot = {
    ...emptyHistogramSnapshot,
    count,
    mean,
    median,
    stddev: Math.ceil(hist.stdDeviation * 100) / 100,
    min: getMin(hist),
    max: getMax(hist),
    data: encodeHistogram(hist),
  };

  result.p90 = hist.getValueAtPercentile(90);
  result.p95 = hist.getValueAtPercentile(95);
  result.p99 = hist.getValueAtPercentile(99);
  result.p995 = hist.getValueAtPercentile(99.5);

  return result;
}

export function aggregateHistograms(recs: HistogramSnapshot[]): Histogram {
  let hist: Histogram = null;
  recs.forEach((rec) => {
    if (rec.data) {
      if (!hist) {
        hist = decodeHistogram(rec.data);
        hist.autoResize = true;
      } else {
        const src = decodeHistogram(rec.data);
        hist.add(src);
      }
    }
  });

  hist = hist || createHistogram();
  return hist;
}

export function aggregateMeter(
  recs: StatisticalSnapshot[],
  type: StatsRateType,
): MeterSummary {
  const clock = new ManualClock();
  const meter = new Meter(clock);
  recs.forEach((rec) => {
    let value = 0;
    switch (type) {
      case StatsRateType.Throughput:
        value = rec.completed;
        break;
      case StatsRateType.Errors:
        value = rec.failed;
        break;
      case StatsRateType.ErrorPercentage: {
        const total = rec.completed + rec.failed;
        value = total > 0 ? rec.failed / total : 0;
        break;
      }
    }
    clock.set(rec.endTime);
    meter.mark(value);
  });

  return meter.getSummary();
}

export function aggregateThroughputRates(
  recs: StatisticalSnapshot[],
): MeterSummary {
  return aggregateMeter(recs, StatsRateType.Throughput);
}

export function aggregateErrorRates(recs: StatisticalSnapshot[]): MeterSummary {
  return aggregateMeter(recs, StatsRateType.Errors);
}

export function aggregateErrorPercentageRates(
  recs: StatisticalSnapshot[],
): MeterSummary {
  return aggregateMeter(recs, StatsRateType.ErrorPercentage);
}

export function aggregateSnapshots(
  recs: StatisticalSnapshot[],
): StatisticalSnapshot {
  let completed = 0;
  let failed = 0;
  let startTime = recs.length ? recs[0].startTime : 0;
  let endTime = startTime;
  const rates = aggregateThroughputRates(recs);

  recs.forEach((rec) => {
    completed = completed + (rec.completed || 0);
    failed = failed + (rec.failed || 0);
    startTime = Math.min(startTime, rec.startTime);
    endTime = Math.max(endTime, rec.endTime);
  });

  const hist = aggregateHistograms(recs);
  const snapshot = getHistogramSnapshot(hist);
  hist.destroy();

  return {
    ...rates,
    ...snapshot,
    completed,
    failed,
    startTime,
    endTime,
  };
}

export function calculateInterval(duration: number): number {
  const asString = ms(duration, { long: true });
  const [, unit] = asString.split(' ');

  switch (unit) {
    case 'millisecond':
    case 'milliseconds':
      return units.MILLISECONDS;
    case 'second':
    case 'seconds':
      return 200 * units.MILLISECONDS;
    case 'minute':
    case 'minutes':
      return 15 * units.SECONDS;
    case 'hour':
    case 'hours':
      return 30 * units.SECONDS;
    case 'day':
    case 'days':
      return 15 * units.MINUTES;
    case 'month':
    case 'months':
      return units.HOURS;
  }

  return units.SECONDS;
}
