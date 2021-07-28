import { AggregatorTypeName, AggregatorTypes, MetricTypes } from '../types';
import { getStaticProp } from '@alpen/shared';
import { metricNameByEnum } from '../utils';

export const aggregatorTypeNameMap: Record<
  AggregatorTypes,
  AggregatorTypeName
> = {
  [AggregatorTypes.None]: 'None',
  [AggregatorTypes.Identity]: 'Identity',
  [AggregatorTypes.Ewma]: 'Ewma',
  [AggregatorTypes.Latest]: 'Latest',
  [AggregatorTypes.Min]: 'Min',
  [AggregatorTypes.Max]: 'Max',
  [AggregatorTypes.Mean]: 'Mean',
  [AggregatorTypes.Quantile]: 'Quantile',
  [AggregatorTypes.Sum]: 'Sum',
  [AggregatorTypes.StdDev]: 'StdDev',
  [AggregatorTypes.P75]: 'P75',
  [AggregatorTypes.P90]: 'P90',
  [AggregatorTypes.P95]: 'P95',
  [AggregatorTypes.P99]: 'P99',
  [AggregatorTypes.P995]: 'P995',
};

// the following is to avoid circular references to basemetric.ts
const MetricStaticProps = ['key', 'description', 'schema', 'unit', 'category'];
const PropKeys = ['value', 'update', 'aggregator'];

function isMetric(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    MetricStaticProps.every((prop) => !!getStaticProp(value, prop)) &&
    PropKeys.every((prop) => prop in (value as any))
  );
}

export function getMetricTypeName(metric: unknown): string {
  if (typeof metric === 'string') return metric;
  if (isMetric(metric)) {
    const type = getStaticProp(metric, 'key') as MetricTypes;
    return metricNameByEnum[type];
  }
  return '';
}
