import type {ExtendedMetricTypeName, MetricTypeName} from './types';
import {MetricGranularity} from './types';
import type {Predicate} from '../types';
import {HostTagKey, MetricName, QueueTagKey} from './metric-name';
import {Metric} from './metric';
import {MetricAggregateByType, metricsInfo} from './metrics-info';
import boom from '@hapi/boom';
import ms from 'ms';
import * as units from './units';
import {DDSketch} from '@datadog/sketches-js';

export type MetricLike = Metric | MetricName | string;

export const CONFIG = {
  units: [
    MetricGranularity.Minute,
    MetricGranularity.Hour,
    MetricGranularity.Day,
    MetricGranularity.Week,
  ],
  prevUnit: {
    [MetricGranularity.Hour]: MetricGranularity.Minute,
    [MetricGranularity.Day]: MetricGranularity.Hour,
    [MetricGranularity.Week]: MetricGranularity.Day,
    [MetricGranularity.Month]: MetricGranularity.Week,
  },
  cronExpressions: ['* * * * *', '0 * * * *', '0 0 * * *', '0 0 * * 0'],
  retention: {
    [MetricGranularity.Minute]: 60 * 6,
    [MetricGranularity.Hour]: 24 * 7,
    [MetricGranularity.Day]: 7,
    [MetricGranularity.Week]: 4,
    [MetricGranularity.Month]: 1,
  },
  defaultRange: {
    [MetricGranularity.Minute]: 60,
    [MetricGranularity.Hour]: 24,
    [MetricGranularity.Day]: 7,
    [MetricGranularity.Week]: 4,
    [MetricGranularity.Month]: 6,
  },
  interval: {
    [MetricGranularity.Minute]: ms('1 min'),
    [MetricGranularity.Hour]: ms('1 hr'),
    [MetricGranularity.Day]: ms('1 day'),
    [MetricGranularity.Week]: ms('1 week'),
    [MetricGranularity.Month]: ms('1 month'),
  },
  snapshotInterval: ms(`1 ${MetricGranularity.Minute}`),
};

export function getSnapshotInterval(): number {
  return CONFIG.snapshotInterval;
}

export function getRetention(unit: MetricGranularity): number {
  return ms(`${CONFIG.retention[unit]} ${unit}`);
}

export const DefaultPercentiles = [0.9, 0.95, 0.99];

export function createSketch(): DDSketch {
  return new DDSketch();
}

export function mergeSketches(
  dst: DDSketch | null | undefined,
  sketches: DDSketch[],
): DDSketch {
  if (!dst) {
    dst = createSketch();
  }
  sketches.forEach((sketch) => {
    dst.merge(sketch);
    // https://github.com/DataDog/sketches-js/pull/18
    dst.zeroCount += sketch.zeroCount;
  });
  return dst;
}

export function createJobNameFilter(
  jobNames?: string | string[],
): Predicate<string> {
  if (!jobNames) {
    return () => true;
  } else if (typeof jobNames === 'string') {
    return (name: string) => name === jobNames;
  } else if (jobNames.length === 0) {
    return () => true;
  } else if (jobNames.length === 1) {
    return (name: string) => name === jobNames[0];
  }
  return (name: string) => !!name && jobNames.includes(name);
}

export function isHostMetric(type: MetricTypeName | MetricName): boolean {
  if (type instanceof MetricName) {
    const host = type.getTagValue(HostTagKey);
    const queue = type.getTagValue(QueueTagKey);
    return !!host && queue?.length === 0;
  }
  const str = '' + type;
  return str.startsWith('redis') || str.includes('queue');
}

export function getCanonicalName(metric: MetricLike): string {
  if (typeof metric === 'string') return metric;
  if (metric instanceof Metric) return metric.canonicalName;
  return metric.canonical;
}

export function getMetricName(metric: MetricLike): MetricName {
  if (typeof metric === 'string') {
    return MetricName.fromCanonicalName(metric);
  }
  if (metric instanceof Metric) {
    return metric.name;
  }
  return metric;
}

export function isValidMetric(
  name: string,
  res: ExtendedMetricTypeName,
): boolean {
  const [metric, agg] = (name ?? '').split('.');
  const info = metricsInfo.find((x) => '' + x.name === metric);
  if (info) {
    res.metric = info.name;
    if (agg) {
      // todo: special case percentiles
      const validAggregates = MetricAggregateByType[info.type];
      if (!validAggregates.find((x) => '' + x === agg)) {
        throw boom.badData(
          `Invalid aggregate "${agg}" for metric type ${info.type}`,
        );
      }
    }
    return true;
  }
  return false;
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

export function getUnitFromDuration(duration: number): MetricGranularity {
  const asString = ms(duration, { long: true });
  const [quantity, unit] = asString.split(' ');

  switch (unit) {
    case 'millisecond':
    case 'milliseconds':
    case 'second':
    case 'seconds':
    case 'minute':
    case 'minutes':
      return MetricGranularity.Minute;
    case 'hour':
    case 'hours':
      return MetricGranularity.Hour;
    case 'day':
    case 'days': {
      const q = parseInt(quantity);
      if (q >= 7) {
        return MetricGranularity.Week;
      }
      return MetricGranularity.Day;
    }
    case 'month':
    case 'months':
      return MetricGranularity.Month;
  }

  return MetricGranularity.Minute;
}

export function getPeriod(unit: MetricGranularity): number {
  return CONFIG.interval[unit];
}
