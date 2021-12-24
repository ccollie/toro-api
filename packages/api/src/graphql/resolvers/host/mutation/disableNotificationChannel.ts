import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const disableNotificationChannel: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'DisableNotificationChannelResult',
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
