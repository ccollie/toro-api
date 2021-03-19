import { GraphQLEnumType } from 'graphql';
import { MetricCategory as MC } from '../../../../types';

export const MetricCategory = new GraphQLEnumType({
  name: 'MetricCategory',
  values: {
    HOST: { value: MC.Host },
    REDIS: { value: MC.Redis },
    QUEUE: { value: MC.Queue },
  },
});
