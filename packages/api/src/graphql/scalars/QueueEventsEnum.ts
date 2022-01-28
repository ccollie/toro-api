import { GraphQLEnumType } from 'graphql';

export const QueueEventsEnum = new GraphQLEnumType({
  name: 'QueueEventsEnum',
  values: {
    cleaned: { value: 'cleaned' },
    drained: { value: 'drained' },
    paused: { value: 'paused' },
    resumed: { value: 'resumed' },
  },
});
