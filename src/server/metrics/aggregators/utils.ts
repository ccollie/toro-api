import { AggregatorTypeName, AggregatorTypes } from '@src/types/metrics';

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
