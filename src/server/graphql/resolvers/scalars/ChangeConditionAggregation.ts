import { ChangeAggregationType } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const ChangeAggregationEnumType = new GraphQLEnumType({
  name: 'ChangeAggregation',
  values: {
    AVG: { value: ChangeAggregationType.Avg },
    MAX: { value: ChangeAggregationType.Max },
    MIN: { value: ChangeAggregationType.Min },
    SUM: { value: ChangeAggregationType.Sum },
    P90: { value: ChangeAggregationType.P90 },
    P95: { value: ChangeAggregationType.P95 },
    P99: { value: ChangeAggregationType.P99 },
  },
});
