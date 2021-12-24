import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const enableNotificationChannel: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'EnableNotificationChannelResult',
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
    const updated = await host.notifications.enableChannel(channelId);

    return {
      updated,
    };
  },
};
