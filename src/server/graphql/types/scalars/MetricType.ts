import { GraphQLEnumType } from 'graphql';
import { MetricType as MT } from '../../../../types';

export const MetricType = new GraphQLEnumType({
  name: 'MetricType',
  values: {
    Gauge: { value: MT.Gauge },
    Rate: { value: MT.Rate },
    Count: { value: MT.Count },
  },
});
