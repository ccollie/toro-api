import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const notificationChannelDisable: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'NotificationChannelDisablePayload',
    fields: {
      updated: 'Boolean!',
    },
  }).NonNull,
  args: {
    hostId: 'ID!',
    channelId: 'ID!',
  },
  async resolve(_: unknown, { channelId, hostId }, { accessors }: EZContext) {
    const host = accessors.getHostById(hostId);
    const updated = await host.notifications.disableChannel(channelId);

    return {
      updated,
    };
  },
};
