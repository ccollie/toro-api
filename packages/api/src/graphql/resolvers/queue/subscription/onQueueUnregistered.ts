import { QUEUE_UNREGISTERED_PREFIX } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const onQueueUnregistered: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueUnregisteredPayload',
    fields: {
      hostId: 'String!',
      queueName: 'String!',
      queueId: 'String!',
      prefix: 'String!',
    },
  }).NonNull,
  args: {
    hostId: {
      type: 'String!',
      description: 'The host to monitor',
    },
  },
  subscribe: (_, { hostId }, context) => {
    const host = context.accessors.getHostById(hostId);
    const channel = `${QUEUE_UNREGISTERED_PREFIX}${host.id}`;
    return context.pubsub.asyncIterator(channel);
  },
};
