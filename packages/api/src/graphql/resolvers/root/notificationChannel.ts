import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../index';
import { Channel } from '@alpen/core';
import { NotificationChannelTC } from '../host/scalars';

export const notificationChannel: FieldConfig = {
  type: NotificationChannelTC,
  args: {
    hostId: 'ID!',
    id: 'ID!',
  },
  async resolve(
    _: unknown,
    { hostId, id },
    { accessors }: EZContext,
  ): Promise<Channel> {
    const host = accessors.getHostById(hostId);
    return await host.notifications.getChannel(id);
  },
};
