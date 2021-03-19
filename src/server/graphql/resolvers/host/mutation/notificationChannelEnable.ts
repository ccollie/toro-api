import { getHostById } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const notificationChannelEnable: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'NotificationChannelEnablePayload',
    fields: {
      updated: 'Boolean!',
    },
  }).NonNull,
  args: {
    hostId: 'String!',
    channelId: 'ID!',
  },
  async resolve(_: unknown, { channelId, hostId }) {
    const host = getHostById(hostId);
    const updated = await host.notifications.enableChannel(channelId);

    return {
      updated,
    };
  },
};
