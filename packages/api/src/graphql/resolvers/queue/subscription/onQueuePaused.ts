import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const onQueuePaused: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueuePausedPayload',
    fields: {
      queueId: 'String!',
    },
  }).NonNull,
  args: {
    queueId: 'String!',
  },
  resolve: async (_, { queueId }) => {
    return {
      queueId,
    };
  },
  subscribe: (_, { queueId }, { accessors }: EZContext) => {
    return accessors.getAsyncIterator(queueId, 'paused');
  },
};
