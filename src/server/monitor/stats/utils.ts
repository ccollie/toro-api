import config from '../../config';
import { pick } from 'lodash';
import {
  AbstractHistogram,
  encodeIntoBase64String,
  decodeFromCompressedBase64,
  build,
} from 'hdr-histogram-js';
import {
  StatisticalSnapshot,
  StatisticalSnapshotOptions,
  StatsGranularity,
} from '@src/types';

const CONFIG = {
  units: ['minutes', 'hours', 'days', 'weeks'],
  prevUnit: {
    hours: 'minutes',
    days: 'hours',
    weeks: 'days',
    months: 'weeks',
  },
};

const defaultPercentiles = [25, 50, 75, 90, 95, 99, 99.5];

const defaultStatisticalSnapshotOptions: StatisticalSnapshotOptions = {
  includePercentiles: true,
  includeData: true,
  percentiles: defaultPercentiles,
};

const emptyStatisticalSnapshot: StatisticalSnapshot = {
  failed: undefined,
  completed: undefined,
  count: 0,
  mean: 0,
  min: 0,
  max: 0,
  stddev: 0,
  p25: 0,
  p50: 0,
  p75: 0,
  p90: 0,
  p95: 0,
  p99: 0,
  // eslint-disable-next-line camelcase,@typescript-eslint/camelcase
  p99_5: 0,
  data: null,
  startTime: undefined,
  endTime: undefined,
};

export function getPrevUnit(unit: string): string {
  return CONFIG.prevUnit[unit];
}

function getMin(hist: AbstractHistogram): number {
  const result = hist.minNonZeroValue;
  return result === Number.MAX_SAFE_INTEGER ? 0 : result;
}

function getMax(hist: AbstractHistogram): number {
  const result = hist.maxValue;
  return result === Number.MIN_SAFE_INTEGER ? 0 : result;
}

export function stringEncode(hist: AbstractHistogram): string {
  return encodeIntoBase64String(hist);
}

export function stringDecode(value): AbstractHistogram {
  return decodeFromCompressedBase64(value);
}

export function getSnapshot(
  hist: AbstractHistogram,
  opts: StatisticalSnapshotOptions = defaultStatisticalSnapshotOptions,
): StatisticalSnapshot {
  opts.percentiles = opts.percentiles || config.get('percentiles');

  const count = hist.getTotalCount();
  const mean = Math.ceil(hist.getMean() * 100) / 100;

  const { startTime, endTime } = opts;

  let result: StatisticalSnapshot = {
    ...emptyStatisticalSnapshot,
    count,
    mean,
    stddev: Math.ceil(hist.getStdDeviation() * 100) / 100,
    min: getMin(hist),
    max: getMax(hist),
    startTime,
    endTime,
  };

  if (opts.includePercentiles && opts.percentiles && opts.percentiles.length) {
    opts.percentiles.forEach((perc) => {
      const key = `p${perc}`.replace('.', '_');
      result[key] = hist.getValueAtPercentile(perc);
    });
  }

  if (typeof opts.counts === 'object') {
    const { failed, completed } = opts.counts;
    let total = failed + completed;
    if (total < 0) {
      total = 0;
    }
    result = { ...result, ...opts.counts };
  }

  if (opts.includeData) {
    result.data = stringEncode(hist);
  }

  return result;
}

const THROUGHPUT_FIELDS = [
  'completed',
  'failed',
  'startTime',
  'endTime',
  'ratePerSecond',
  'count',
  'timestamp',
];

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
  'p25',
  'p50',
  'p75',
  'p90',
  'p95',
  'p99',
  'p99_5',
]);

export function formatSnapshot(val, includeData = true) {
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

export function formatThroughput(val) {
  if (!val) return val;
  val = pick(val, THROUGHPUT_FIELDS);
  Object.keys(val).forEach((key) => {
    const value = val[key];
    if (INT_FIELDS.has(key)) {
      val[key] = parseInt(value);
    } else if (FLOAT_FIELDS.has(key)) {
      val[key] = parseFloat(value);
    }
  });
  return val;
}

export function createHistogram(): AbstractHistogram {
  // this.histogram = new Histogram(1, MAX_DURATION_IN_MS, 2);
  const histogram = build({
    numberOfSignificantValueDigits: 2,
  });
  histogram.autoResize = true;
  return histogram;
}

export function aggregateHistograms(
  recs: StatisticalSnapshot[],
): StatisticalSnapshot {
  let hist: AbstractHistogram = null;
  let completed = 0;
  let failed = 0;
  recs.forEach((rec) => {
    if (rec.data) {
      if (!hist) {
        hist = stringDecode(rec.data);
        hist.autoResize = true;
      } else {
        const src = stringDecode(rec.data);
        hist.add(src);
      }
    }
    completed = completed + (rec.completed || 0);
    failed = failed + (rec.failed || 0);
  });

  hist = hist || createHistogram();

  const snapshot = getSnapshot(hist);
  snapshot.data = stringEncode(hist);
  snapshot.completed = completed;
  snapshot.failed = failed;

  return snapshot;
}
