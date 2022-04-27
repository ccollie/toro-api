import type {
  DistributionAggregate,
  ExtendedMetricTypeName,
  MetricTypeName,
} from './types';
import type { Predicate } from '../types';
import { HostTagKey, MetricName, MetricType, QueueTagKey } from './metric-name';
import { Metric } from './metric';
import { metricsInfo } from './metrics-info';
import boom from '@hapi/boom';

export type MetricLike = Metric | MetricName | string;

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

const AggTypes: DistributionAggregate[] = [
  'sum',
  'count',
  'min',
  'max',
  'avg',
  'p50',
  'p75',
  'p90',
  'p99',
];

export function isValidMetric(
  name: string,
  res: ExtendedMetricTypeName,
): boolean {
  const [metric, agg] = (name ?? '').split('.');
  const info = metricsInfo.find((x) => '' + x.type === metric);
  if (info) {
    res.metric = info.type;
    if (info.metricType === MetricType.Distribution) {
      if (agg) {
        if (AggTypes.find((x) => x == agg)) {
          res.aggregate = agg as DistributionAggregate;
        } else {
          throw boom.badData(`Invalid distribution aggregate "${agg}"`);
        }
      }
    } else if (agg) {
      throw boom.badData(
        `Unexpected aggregate. ${metric} is not a distribution`,
      );
    }
    return true;
  }
  return false;
}
