import {
  HistogramSnapshot,
  StatisticalSnapshot,
  StatisticalSnapshotOptions,
  StatsGranularity,
} from '../../types';
import {
  build,
  decodeFromCompressedBase64,
  encodeIntoCompressedBase64,
  Histogram,
  initWebAssemblySync,
} from 'hdr-histogram-js';
import ms from 'ms';
import { DDSketch } from 'sketches-js';
import * as units from './units';

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

const defaultPercentiles = [90, 95, 99, 99.5];

const defaultStatisticalSnapshotOptions: StatisticalSnapshotOptions = {
  includePercentiles: true,
  includeData: true,
  percentiles: defaultPercentiles,
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

export function createHistogram(packed = true): Histogram {
  ensureWasmLoaded();
  // this.histogram = new Histogram(1, MAX_DURATION_IN_MS, 2);
  return build({
    numberOfSignificantValueDigits: 2,
    bitBucketSize: packed ? 'packed' : 32,
    autoResize: true,
    useWebAssembly: true,
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

export function getHistogramSnapshot(
  hist: Histogram,
  opts: StatisticalSnapshotOptions = defaultStatisticalSnapshotOptions,
): HistogramSnapshot {
  opts.percentiles = opts.percentiles || defaultPercentiles;

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

  if (opts.includePercentiles) {
    opts.percentiles.forEach((percent) => {
      const key = `p${percent}`.replace('.', '');
      result[key] = hist.getValueAtPercentile(percent);
    });
  }

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

  const hist = aggregateHistograms(recs);
  const snapshot = getHistogramSnapshot(hist);
  hist.destroy();

  return {
    ...snapshot,
    completed,
    failed,
    startTime,
    endTime,
  };
}

export function clearDDSketch(sketch: DDSketch): void {
  sketch.bins = {};
  sketch.n = 0;
  sketch.numBins = 0;
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
      return 100 * units.MILLISECONDS;
    case 'minute':
    case 'minutes':
      return 5 * units.SECONDS;
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
