import boom from '@hapi/boom';
import { BaseAggregator } from './aggregator';
import { NullAggregator } from './nullAggregator';
import { MinAggregator } from './minAggregator';
import { MaxAggregator } from './maxAggregator';
import { SumAggregator } from './sumAggregator';
import { MeanAggregator } from './meanAggregator';
import { LatestAggregator } from './latestAggregator';
import { EWMAAggregator } from './ewmaAggregator';
import { StandardDeviationAggregator } from './standardDeviationAggregator';
import { SlidingTimeWindowAggregator } from './SlidingTimeWindowAggregator';
import {
  P75Aggregator,
  P90Aggregator,
  P95Aggregator,
  P995Aggregator,
  P99Aggregator,
  QuantileAggregator,
} from './quantileAggregator';
import type { PercentileAggregatorOptions } from './quantileAggregator';
import { Constructor } from '../../types';
import { AggregatorTypes } from '../types';

export type AggregatorClass = Constructor<BaseAggregator>;

export const aggregateMap = new Map<AggregatorTypes, AggregatorClass | null>();

aggregateMap[AggregatorTypes.None] = null;
aggregateMap[AggregatorTypes.Identity] = NullAggregator;
aggregateMap[AggregatorTypes.Ewma] = EWMAAggregator;
aggregateMap[AggregatorTypes.Latest] = LatestAggregator;
aggregateMap[AggregatorTypes.Min] = MinAggregator;
aggregateMap[AggregatorTypes.Max] = MaxAggregator;
aggregateMap[AggregatorTypes.Mean] = MeanAggregator;
aggregateMap[AggregatorTypes.Quantile] = QuantileAggregator;
aggregateMap[AggregatorTypes.Sum] = SumAggregator;
aggregateMap[AggregatorTypes.StdDev] = StandardDeviationAggregator;
aggregateMap[AggregatorTypes.P75] = P75Aggregator;
aggregateMap[AggregatorTypes.P90] = P90Aggregator;
aggregateMap[AggregatorTypes.P95] = P95Aggregator;
aggregateMap[AggregatorTypes.P99] = P99Aggregator;
aggregateMap[AggregatorTypes.P995] = P995Aggregator;

const aggregatesByName: {
  [key in keyof typeof AggregatorTypes]: AggregatorClass | null;
} = {
  None: null,
  Identity: NullAggregator,
  Ewma: EWMAAggregator,
  Latest: LatestAggregator,
  Min: MinAggregator,
  Max: MaxAggregator,
  Mean: MeanAggregator,
  Quantile: QuantileAggregator,
  Sum: SumAggregator,
  StdDev: StandardDeviationAggregator,
  P75: P75Aggregator,
  P90: P90Aggregator,
  P95: P95Aggregator,
  P99: P99Aggregator,
  P995: P995Aggregator,
};

function findAggregator(
  type: string | AggregatorTypes = AggregatorTypes.Identity,
): AggregatorClass {
  let ctor: AggregatorClass;

  if (typeof type === 'string') {
    ctor = aggregatesByName[type];
  } else {
    ctor = aggregateMap[type];
  }
  if (!ctor) {
    throw boom.badRequest(`Invalid aggregator type "${type}"`);
  }
  return ctor;
}

export function createAggregator(
  type: string | AggregatorTypes = AggregatorTypes.Identity,
  options?: Record<string, any>,
): BaseAggregator {
  const ctor = findAggregator(type);
  return new ctor(options);
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
  EWMAAggregator,
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
  SlidingTimeWindowAggregator,
  StandardDeviationAggregator,
};
