import { NOTIFICATION_CHANNEL_DELETED_PREFIX } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getHostById } from '../../../helpers';

export const onNotificationChannelDeleted: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnNotificationChannelDeletedPayload',
    fields: {
      hostId: 'String!',
      channelId: 'String!',
      channelName: 'String!',
      channelType: 'String!',
    },
  }).NonNull,
  args: {
    hostId: {
      type: 'String!',
      description: 'The host to monitor',
    },
  },
  subscribe: (_, { hostId }, context) => {
    const host = getHostById(hostId);
    const channel = `${NOTIFICATION_CHANNEL_DELETED_PREFIX}${host.id}`;
    return context.pubsub.asyncIterator(channel);
  },
};
