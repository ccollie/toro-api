import { EZContext } from 'graphql-ez';
import { NOTIFICATION_CHANNEL_ADDED_PREFIX } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const onNotificationChannelCreated: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnNotificationChannelCreatedPayload',
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
    const channel = `${NOTIFICATION_CHANNEL_ADDED_PREFIX}${host.id}`;
    return pubsub.subscribe(channel);
  },
};
