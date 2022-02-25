import { AggregateTypeEnum } from '@/types';

export const SlidingWindowAggregates = [
  AggregateTypeEnum.Ewma,
  AggregateTypeEnum.Min,
  AggregateTypeEnum.Max,
  AggregateTypeEnum.Mean,
  AggregateTypeEnum.Sum,
  AggregateTypeEnum.StdDev,
  AggregateTypeEnum.P75,
  AggregateTypeEnum.P90,
  AggregateTypeEnum.P95,
  AggregateTypeEnum.P99,
  AggregateTypeEnum.P995,
];

export function isSlidingWindowAggregate(type: AggregateTypeEnum): boolean {
  return !!SlidingWindowAggregates.find(aggregate => aggregate === type);
}
