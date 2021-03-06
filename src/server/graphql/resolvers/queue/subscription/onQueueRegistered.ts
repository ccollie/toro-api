import { QUEUE_REGISTERED_PREFIX, getHostById } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const onQueueRegistered: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueRegisteredPayload',
    fields: {
      hostId: 'String!',
      queueId: 'String!',
      queueName: 'String!',
      prefix: 'String!',
    },
  }).NonNull,
  args: {
    hostId: {
      type: 'String!',
      description: 'The host to monitor',
    },
  },
  subscribe: (_, { hostId }, { pubsub }) => {
    const host = getHostById(hostId);
    const channel = `${QUEUE_REGISTERED_PREFIX}${host.id}`;
    return pubsub.asyncIterator(channel);
  },
};
