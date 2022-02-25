import { GraphQLEnumType } from 'graphql';

export const FinishedStatusEnum = new GraphQLEnumType({
  name: 'FinishedStatus',
  values: {
    completed: { value: 'completed' },
    failed: { value: 'failed' },
  },
});
