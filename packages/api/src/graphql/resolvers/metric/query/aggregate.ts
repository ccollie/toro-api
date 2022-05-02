import {
  ObjectTypeComposerFieldConfigDefinition,
} from 'graphql-compose';
import { MetricsQueryInputTC } from '../scalars';
import { EZContext } from 'graphql-ez';
import boom from '@hapi/boom';
import { getMetricManagerFromMetric } from '../utils';

export const aggregate: ObjectTypeComposerFieldConfigDefinition<any, any> = {
  type: 'Int!',
  description: 'Aggregates metrics within a range',
  args: {
    input: MetricsQueryInputTC.NonNull,
  },
  async resolve(_, { input }, context: EZContext) {
    const { metric, granularity, start, end, aggregator } = input;
    const manager = getMetricManagerFromMetric(context, metric);
    if (!manager) {
      throw boom.badRequest('No metric manager associated with the metric');
    }
    return manager.aggregate(metric, granularity, start, end, aggregator);
  },
};
