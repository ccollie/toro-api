import { QUEUE_REGISTERED_PREFIX } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getHostById } from '../../../helpers';
import { pubsub } from '../../../helpers/subscriptionManager';

export const onQueueRegistered: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueRegisteredPayload',
    fields: {
      hostId: 'String!',
      queueId: 'String!',
      queueName: 'String!',
      prefix: 'String!',
    },
  }),
  args: {
    hostId: {
      type: 'String!',
      description: 'The host to monitor',
    },
  },
  subscribe: (_, { hostId }) => {
    const host = getHostById(hostId);
    const channel = `${QUEUE_REGISTERED_PREFIX}${host.id}`;
    return pubsub.asyncIterator(channel);
  },
};
