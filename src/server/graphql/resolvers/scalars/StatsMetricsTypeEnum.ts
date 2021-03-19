import { GraphQLEnumType } from 'graphql';

export const StatsMetricsTypeEnum = new GraphQLEnumType({
  name: 'StatsMetricType',
  values: {
    Latency: { value: 'latency' },
    Wait: { value: 'wait' },
  },
});
