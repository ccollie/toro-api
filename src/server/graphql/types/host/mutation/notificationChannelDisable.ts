import { getHostById } from '../../../helpers';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const notificationChannelDisable: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'NotificationChannelDisablePayload',
    fields: {
      updated: 'Boolean!',
    },
  }),
  args: {
    hostId: 'String!',
    channelId: 'ID!',
  },
  async resolve(_: unknown, { channelId, hostId }) {
    const host = getHostById(hostId);
    const updated = await host.notifications.disableChannel(channelId);

    return {
      updated,
    };
  },
};
