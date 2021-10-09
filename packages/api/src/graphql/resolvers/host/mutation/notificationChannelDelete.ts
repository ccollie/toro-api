import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { NOTIFICATION_CHANNEL_DELETED_PREFIX } from '../../../helpers';

export const notificationChannelDelete: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'NotificationChannelDeletePayload',
    fields: {
      hostId: 'ID!',
      channelId: 'ID!',
      deleted: 'Boolean!',
    },
  }).NonNull,
  args: {
    hostId: 'ID!',
    channelId: 'ID!',
  },
  async resolve(
    _: unknown,
    { channelId, hostId },
    { publish, accessors }: EZContext,
  ) {
    const host = accessors.getHostById(hostId);
    const channel = await host.notifications.getChannel(channelId);
    let deleted = false;

    if (channel) {
      deleted = await host.notifications.deleteChannel(channelId);
      if (deleted) {
        const event = `${NOTIFICATION_CHANNEL_DELETED_PREFIX}${host.id}`;
        publish(event, {
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
