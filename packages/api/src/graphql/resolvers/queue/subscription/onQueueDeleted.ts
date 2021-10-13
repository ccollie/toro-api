import { EZContext } from 'graphql-ez';
import { QUEUE_DELETED_PREFIX } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const onQueueDeleted: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueDeletedPayload',
    fields: {
      queueId: {
        type: 'String!',
        description: 'The id of the deleted queue',
      },
      queueName: {
        type: 'String!',
        description: 'The name of the deleted queue',
      },
      hostId: {
        type: 'String!',
        description: 'The queue host id',
      },
      deletedKeys: {
        type: 'Int!',
        description: 'The number of keys deleted',
      },
    },
  }).NonNull,
  args: {
    hostId: {
      type: 'String!',
      description: 'The host to monitor',
    },
  },
  subscribe: (_, { hostId }, { pubsub, accessors }: EZContext) => {
    const host = accessors.getHostById(hostId);
    const channel = `${QUEUE_DELETED_PREFIX}${host.id}`;
    return pubsub.subscribe(channel);
  },
};
