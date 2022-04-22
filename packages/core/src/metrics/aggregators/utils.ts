import { AggregatorTypeName, AggregatorTypes } from '../../types';

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

// the following is to avoid circular references to metric.ts
function isMetric(obj: unknown): boolean {
  if (typeof obj === 'object') {
    let proto;
    while (proto = Object.getPrototypeOf(obj)) {
      if (proto.constructor.name === 'Metric') {
        return true;
      }
      obj = proto;
    }
  }
  return false;
}
