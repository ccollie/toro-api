import { ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { MeterTC, MetricsQueryInputTC } from '../scalars';
import { EZContext } from 'graphql-ez';
import { getMetricManagerFromMetric } from '../utils';

export const rate: ObjectTypeComposerFieldConfigDefinition<any, any> = {
  type: MeterTC.NonNull,
  description: 'Gets rate data for a metric within a range',
  args: {
    input: MetricsQueryInputTC.NonNull,
  },
  async resolve(_, { input }, context: EZContext) {
    const { metric, granularity, start, end, aggregator } = input;
    const manager = getMetricManagerFromMetric(context, metric);
    return manager.getRate(metric, granularity, start, end, aggregator);
  },
};
