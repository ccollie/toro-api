import boom from '@hapi/boom';
import { BaseAggregator } from './aggregator';
import { NullAggregator } from './nullAggregator';
import { MinAggregator } from './minAggregator';
import { MaxAggregator } from './maxAggregator';
import { SumAggregator } from './sumAggregator';
import { MeanAggregator } from './meanAggregator';
import {
  EWMA1MinAggregator,
  EWMA5MinAggregator,
  EWMA15MinAggregator,
} from './ewmaAggregator';
import { StandardDeviationAggregator } from './standardDeviationAggregator';
import { SlidingTimeWindowAggregator } from './slidingTimeWindowAggregator';
import {
  QuantileAggregator,
  P75Aggregator,
  P90Aggregator,
  P95Aggregator,
  P99Aggregator,
  P995Aggregator,
  PercentileAggregatorOptions,
} from './quantileAggregator';
import { Clock } from '../../lib';
import { Constructor } from '../../../types';

export type AggregatorClass = Constructor<BaseAggregator>;

export const aggregateMap: Record<string, AggregatorClass> = {
  none: NullAggregator,
  ewma1min: EWMA1MinAggregator,
  ewma5min: EWMA5MinAggregator,
  ewma15Min: EWMA15MinAggregator,
  min: MinAggregator,
  max: MaxAggregator,
  mean: MeanAggregator,
  sum: SumAggregator,
  stddev: StandardDeviationAggregator,
  p75: P75Aggregator,
  p90: P90Aggregator,
  p95: P95Aggregator,
  p99: P99Aggregator,
  p995: P995Aggregator,
};

export function createAggregator(
  type = 'default',
  clock: Clock,
  options?: Record<string, any>,
): BaseAggregator {
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
    throw boom.badRequest(`Invalid Aggregate type "${type}"`);
  }
  options = options || Object.create(null);
  const schema = (ctor as any).schema;
  if (schema) {
    const { error, value } = schema.validate(options);
    if (error) {
      throw error;
    }
    options = value;
  }
  return new ctor(clock, options);
}

export {
  BaseAggregator,
  EWMA1MinAggregator,
  EWMA5MinAggregator,
  EWMA15MinAggregator,
  NullAggregator,
  MinAggregator,
  P75Aggregator,
  P90Aggregator,
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
