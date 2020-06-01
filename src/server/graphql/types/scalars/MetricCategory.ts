import { GraphQLEnumType } from 'graphql';
import { MetricCategory as MC } from '../../../../types';

export const MetricCategory = new GraphQLEnumType({
  name: 'MetricCategory',
  values: {
    HOST: { value: MC.HOST },
    REDIS: { value: MC.REDIS },
    QUEUE: { value: MC.QUEUE },
  },
});
