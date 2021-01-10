import {
  Histogram,
  build,
  decodeFromCompressedBase64,
  encodeIntoCompressedBase64,
  initWebAssemblySync,
} from 'hdr-histogram-js';
import { HistogramSnapshot, StatisticalSnapshotOptions } from '@src/types';

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

function getMin(hist: Histogram): number {
  const result = hist.minNonZeroValue;
  return result === Number.MAX_SAFE_INTEGER ? 0 : result;
}

function getMax(hist: Histogram): number {
  const result = hist.maxValue;
  return result === Number.MIN_SAFE_INTEGER ? 0 : result;
}

export function encodeHistogram(hist: Histogram): string {
  ensureWasmLoaded();
  return encodeIntoCompressedBase64(hist);
}

export function decodeHistogram(value: string): Histogram {
  ensureWasmLoaded();
  return decodeFromCompressedBase64(value, 'packed', true);
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
