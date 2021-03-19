import { QueueEventsEnum as Enum } from '../../../../types';
import { GraphQLEnumType } from 'graphql';

export const QueueEventsEnum = new GraphQLEnumType({
  name: 'QueueEventsEnum',
  values: {
    [Enum.CLEANED]: { value: Enum.CLEANED },
    [Enum.DRAINED]: { value: Enum.DRAINED },
    [Enum.PAUSED]: { value: Enum.PAUSED },
    [Enum.RESUMED]: { value: Enum.RESUMED },
  },
});
