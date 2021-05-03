import boom from '@hapi/boom';
import { BaseAggregator } from './aggregator';
import { NullAggregator } from './nullAggregator';
import { MinAggregator } from './minAggregator';
import { MaxAggregator } from './maxAggregator';
import { SumAggregator } from './sumAggregator';
import { MeanAggregator } from './meanAggregator';
import { LatestAggregator } from './latestAggregator';
import {
  EWMA15MinAggregator,
  EWMA1MinAggregator,
  EWMA5MinAggregator,
} from './ewmaAggregator';
import { StandardDeviationAggregator } from './standardDeviationAggregator';
import { SlidingTimeWindowAggregator } from './slidingTimeWindowAggregator';
import {
  P75Aggregator,
  P90Aggregator,
  P95Aggregator,
  P995Aggregator,
  P99Aggregator,
  PercentileAggregatorOptions,
  QuantileAggregator,
} from './quantileAggregator';
import { Clock } from '../../lib';
import { AggregatorTypes, Constructor } from '../../../types';

export type AggregatorClass = Constructor<BaseAggregator>;

export const aggregateMap: Record<AggregatorTypes, AggregatorClass | null> = {
  [AggregatorTypes.None]: null,
  [AggregatorTypes.Null]: NullAggregator,
  [AggregatorTypes.Ewma1Min]: EWMA1MinAggregator,
  [AggregatorTypes.Ewma5Min]: EWMA5MinAggregator,
  [AggregatorTypes.Ewma15Min]: EWMA15MinAggregator,
  [AggregatorTypes.Latest]: LatestAggregator,
  [AggregatorTypes.Min]: MinAggregator,
  [AggregatorTypes.Max]: MaxAggregator,
  [AggregatorTypes.Mean]: MeanAggregator,
  [AggregatorTypes.Quantile]: QuantileAggregator,
  [AggregatorTypes.Sum]: SumAggregator,
  [AggregatorTypes.StdDev]: StandardDeviationAggregator,
  [AggregatorTypes.P75]: P75Aggregator,
  [AggregatorTypes.P90]: P90Aggregator,
  [AggregatorTypes.P95]: P95Aggregator,
  [AggregatorTypes.P99]: P99Aggregator,
  [AggregatorTypes.P995]: P995Aggregator,
};

function findAggregator(
  type: string | AggregatorTypes = AggregatorTypes.Null,
): AggregatorClass {
  let ctor = aggregateMap[type];
  if (!ctor) {
    const entries = Object.values(aggregateMap);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const aggType = (entry as any).key;
      if (type === aggType) {
        ctor = entry;
        break;
      }
    }
  }
  if (!ctor) {
    throw boom.badRequest(`Invalid aggregator type "${type}"`);
  }
  return ctor;
}

export function createAggregator(
  type: string | AggregatorTypes = AggregatorTypes.Null,
  clock: Clock,
  options?: Record<string, any>,
): BaseAggregator {
  const ctor = findAggregator(type);
  return new ctor(clock, options);
}

export function validateAggregatorOpts(
  type: string | AggregatorTypes,
  options?: Record<string, any>,
): Record<string, any> | undefined {
  const ctor = findAggregator(type);
  const validateOptions: (opts: any) => any = (ctor as any).validateOptions;
  return validateOptions(options);
}

export {
  BaseAggregator,
  EWMA1MinAggregator,
  EWMA5MinAggregator,
  EWMA15MinAggregator,
  LatestAggregator,
  NullAggregator,
  MinAggregator,
  P75Aggregator,
  P90Aggregator,
  P95Aggregator,
  P99Aggregator,
  P995Aggregator,
  PercentileAggregatorOptions,
  MaxAggregator,
  SumAggregator,
  MeanAggregator,
  QuantileAggregator,
  StandardDeviationAggregator,
  SlidingTimeWindowAggregator,
};
