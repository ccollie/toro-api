import { schemaComposer } from 'graphql-compose';
import { getAsyncIterator } from '../../../helpers';
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
  subscribe: (_, { queueId }) => {
    return getAsyncIterator(queueId, 'resumed');
  },
};
