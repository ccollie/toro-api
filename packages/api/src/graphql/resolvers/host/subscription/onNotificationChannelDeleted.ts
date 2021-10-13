import { EZContext } from 'graphql-ez';
import { NOTIFICATION_CHANNEL_DELETED_PREFIX } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

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
  subscribe: (_, { hostId }, { pubsub, accessors }: EZContext) => {
    const host = accessors.getHostById(hostId);
    const channel = `${NOTIFICATION_CHANNEL_DELETED_PREFIX}${host.id}`;
    return pubsub.subscribe(channel);
  },
};
