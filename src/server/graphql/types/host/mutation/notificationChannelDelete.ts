import { getHostById } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { NOTIFICATION_CHANNEL_DELETED_PREFIX } from '../../../helpers';

export const notificationChannelDelete: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'NotificationChannelDeletePayload',
    fields: {
      hostId: 'String!',
      channelId: 'ID!',
      deleted: 'Boolean!',
    },
  }),
  args: {
    hostId: 'String!',
    channelId: 'ID!',
  },
  async resolve(_: unknown, { channelId, hostId }, context) {
    const host = getHostById(hostId);
    const channel = await host.notifications.getChannel(channelId);
    let deleted = false;

    if (channel) {
      deleted = await host.notifications.deleteChannel(channelId);
      if (deleted) {
        const event = `${NOTIFICATION_CHANNEL_DELETED_PREFIX}${host.id}`;
        context.publish(event, {
          hostId: host.id,
          channelId,
          channelName: channel.name,
          channelType: channel.type,
        });
      }
    }

    return {
      hostId,
      channelId,
      deleted,
    };
  },
};
