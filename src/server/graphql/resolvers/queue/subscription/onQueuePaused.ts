import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getAsyncIterator } from '../../../helpers';

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
  subscribe: (_, { queueId }) => {
    return getAsyncIterator(queueId, 'paused');
  },
};
