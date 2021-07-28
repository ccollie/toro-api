import { FieldConfig } from '../index';
import { getHostById } from '../../helpers';
import { Channel } from '@alpen/core';
import { NotificationChannelTC } from '../host/scalars';

export const notificationChannel: FieldConfig = {
  type: NotificationChannelTC,
  args: {
    hostId: 'ID!',
    id: 'ID!',
  },
  async resolve(_: unknown, { hostId, id }): Promise<Channel> {
    const host = getHostById(hostId);
    return await host.notifications.getChannel(id);
  },
};
