// https://github.com/eoinmurray/histogram/blob/master/histogram.js
'use strict';
import { decodeFromCompressedBase64, JsHistogram } from 'hdr-histogram-js';
import RecordedValuesIterator from 'hdr-histogram-js/dist/RecordedValuesIterator';
import { StatisticalSnapshot } from '../../types';

export enum HistogramBinningMethod {
  Auto = 'Auto',
  Sturges = 'Sturges',
  Freedman = 'Freedman',
}

interface HistogramBinningFunction {
  (range: number[], values: number[], n: number): number;
}

export interface HistogramRangeFunction {
  (values: number[], n: number): number[];
}

function quantile(data: number[], p: number): number {
  const idx = 1 + (data.length - 1) * p,
    lo = Math.floor(idx),
    hi = Math.ceil(idx),
    h = idx - lo;
  return (1 - h) * data[lo] + h * data[hi];
}

function binFunctionFreedmanDiaconis(
  range: number[],
  values: number[],
  n: number,
): number {
  const iqr = quantile(values, 0.75) - quantile(values, 0.25);

  // If IQR is 0, fd returns 1 bin. This is as per the NumPy implementation:
  //   https://github.com/numpy/numpy/blob/master/numpy/lib/histograms.py#L138
  let bins = 1;
  if (iqr !== 0.0) {
    const [min, max] = range;
    const fd = 2.0 * (iqr / Math.pow(n, 1.0 / 3.0));
    bins = Math.ceil((max - min) / fd);
  }
  return bins;
}

function binFunctionSturges(
  range: number[],
  values: number[],
  n: number,
): number {
  return Math.ceil(Math.log(n) / Math.LN2 + 1);
}

function binFunctionAuto(range: number[], values: number[], n: number): number {
  const sturges = Math.ceil(Math.log(n) / Math.LN2 + 1);
  const fd = binFunctionFreedmanDiaconis(range, values, n);
  return Math.max(sturges, fd);
}

function prettify(x: number): number {
  let scale = Math.pow(10, Math.floor(Math.log(x / 10) / Math.LN10));
  const err = (10 / x) * scale;
  if (err <= 0.15) scale *= 10;
  else if (err <= 0.35) scale *= 5;
  else if (err <= 0.75) scale *= 2;
  return scale * 10;
}

const binnerMap: Record<HistogramBinningMethod, HistogramBinningFunction> = {
  [HistogramBinningMethod.Auto]: binFunctionAuto,
  [HistogramBinningMethod.Sturges]: binFunctionSturges,
  [HistogramBinningMethod.Freedman]: binFunctionFreedmanDiaconis,
};

export type HistogramOptions = {
  bins?: number | HistogramBinningMethod;
  range?: number[] | HistogramRangeFunction;
  pretty?: boolean;
};

export const DefaultHistogramOptions: HistogramOptions = {
  bins: HistogramBinningMethod.Auto,
  pretty: true,
};

export type HistogramBin = {
  count: number;
  x0: number;
  x1: number;
};

export type BinnedHistogramValues = {
  min: number;
  max: number;
  total: number;
  binWidth: number;
  bins: HistogramBin[];
};

export function computeHistogramBins(
  snapshot: StatisticalSnapshot,
  opts: HistogramOptions = DefaultHistogramOptions,
): BinnedHistogramValues {
  const histogram = decodeFromCompressedBase64(snapshot.data, 32, false);
  const iterator = new RecordedValuesIterator(histogram as JsHistogram);

  if (histogram.totalCount === 0) {
    return {
      min: histogram.minNonZeroValue,
      max: histogram.maxValue,
      total: 0,
      binWidth: 0,
      bins: [],
    };
  }

  let binningFunction: HistogramBinningFunction = binFunctionAuto;
  if (opts.bins !== undefined) {
    if (typeof opts.bins === 'number') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      binningFunction = (
        range: number[],
        values: number[],
        n: number,
      ): number => opts.bins as number;
    } else {
      binningFunction = binnerMap[opts.bins as HistogramBinningMethod];
    }
  }

  function bisect(a: HistogramBin[], x: number, lo = 0, hi: number): number {
    hi = hi || a.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (x < a[mid].x0) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  function makeBins(min: number, width: number, n: number): HistogramBin[] {
    const f = new Array<HistogramBin>(n);

    let x = -1;
    let lower = min;
    while (++x <= n) {
      f[x] = {
        x0: lower,
        x1: lower + width,
        count: 0,
      };
      lower = lower + width;
    }

    return f;
  }

  const values: number[] = [];
  const counts: number[] = [];

  while (iterator.hasNext()) {
    const current = iterator.next();
    values.push(current.valueIteratedTo);
    counts.push(current.countAtValueIteratedTo);
  }

  const n = values.length;

  let range;
  if (opts.range) {
    if (Array.isArray(opts.range)) {
      range = opts.range as number[];
    } else {
      range = opts.range(values, n);
    }
  } else {
    range = [values[0], values[n - 1]];
  }
  const [min = values[0], max = values[n - 1]] = range;

  let binCount = binningFunction(range, values, n);
  if (opts.pretty) {
    binCount = prettify(binCount);
  }
  const binWidth = (max - min) / n;

  const bins = makeBins(min, binWidth, binCount);
  const m = bins.length - 1;
  let total = 0;

  if (m > 0) {
    let i = -1;
    while (++i < n) {
      const x = values[i];
      if (x >= min && x <= max) {
        const bin = bins[bisect(bins, x, 1, m) - 1];
        bin.count += counts[i];
        total += counts[i];
      }
    }
  }

  return {
    binWidth,
    min,
    max,
    total,
    bins,
  };
}
