import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';

export const onQueueResumed: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueResumedPayload',
    fields: {
      queueId: 'String!',
    },
  }).NonNull,
  args: {
    queueId: 'ID!',
  },
  resolve: (_, { queueId }) => {
    return {
      queueId,
    };
  },
  subscribe: (_, { queueId }, { accessors }: EZContext) => {
    return accessors.getAsyncIterator(queueId, 'resumed');
  },
};
