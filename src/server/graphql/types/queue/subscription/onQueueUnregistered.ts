import { QUEUE_UNREGISTERED_PREFIX } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getHostById } from '../../../helpers';

export const onQueueUnregistered: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueUnregisteredPayload',
    fields: {
      hostId: 'String!',
      queueName: 'String!',
      queueId: 'String!',
      prefix: 'String!',
    },
  }),
  args: {
    hostId: {
      type: 'String!',
      description: 'The host to monitor',
    },
  },
  subscribe: (_, { hostId }, context) => {
    const host = getHostById(hostId);
    const channel = `${QUEUE_UNREGISTERED_PREFIX}${host.id}`;
    return context.pubsub.asyncIterator(channel);
  },
};
