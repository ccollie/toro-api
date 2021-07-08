import { QueueEventsEnum as Enum } from '@src/types';
import { GraphQLEnumType } from 'graphql';

export const QueueEventsEnum = new GraphQLEnumType({
  name: 'QueueEventsEnum',
  values: {
    CLEANED: { value: Enum.CLEANED },
    DRAINED: { value: Enum.DRAINED },
    PAUSED: { value: Enum.PAUSED },
    RESUMED: { value: Enum.RESUMED },
  },
});
