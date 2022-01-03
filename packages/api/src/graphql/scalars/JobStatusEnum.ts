import { GraphQLEnumType } from 'graphql';

export const JobStatusEnumType = new GraphQLEnumType({
  name: 'JobStatus',
  values: {
    completed: { value: 'completed' },
    waiting: { value: 'waiting' },
    active: { value: 'active' },
    delayed: { value: 'delayed' },
    failed: { value: 'failed' },
    paused: { value: 'paused' },
    // eslint-disable-next-line camelcase
    waiting_children: { value: 'waiting-children' },
    unknown: { value: 'unknown' },
  },
});
