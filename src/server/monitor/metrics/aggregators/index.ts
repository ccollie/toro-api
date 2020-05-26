import boom from '@hapi/boom';
import { BaseAggregator, NullAggregator } from './aggregator';

import { MinAggregator } from './minAggregator';
import { MaxAggregator } from './maxAggregator';
import { SumAggregator } from './sumAggregator';
import { ZScoreAggregator } from './ZScoreAggregator';
import { MeanAggregator } from './meanAggregator';
import { QuantileAggregator } from './quantileAggregator';
import { StandardDeviationAggregator } from './standardDeviationAggregator';
import { VarianceAggregator } from './varianceAggregator';

const classMap: Record<string, any> = {
  min: MinAggregator,
  max: MaxAggregator,
  mean: MeanAggregator,
  sum: SumAggregator,
  variance: VarianceAggregator,
  stdDev: StandardDeviationAggregator,
  quantile: QuantileAggregator,
  zscore: ZScoreAggregator,
  default: NullAggregator,
};

export function createAggregator(type = 'default', options): BaseAggregator {
  const ctor = classMap[type];
  if (!ctor) {
    throw boom.badRequest(`Invalid Aggregate type "${type}"`);
  }
  const schema = ctor.schema;
  if (schema) {
    const { error, value } = schema.validate(options);
    if (error) {
      throw error;
    }
    options = value;
  }
  return new ctor(options);
}

export {
  BaseAggregator,
  MinAggregator,
  MaxAggregator,
  SumAggregator,
  ZScoreAggregator,
  MeanAggregator,
  QuantileAggregator,
  StandardDeviationAggregator,
  VarianceAggregator,
};
