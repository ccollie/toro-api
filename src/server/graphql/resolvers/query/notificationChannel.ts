import { FieldConfig } from '../index';
import { getHostById } from '../../helpers';
import { Channel } from '../../../notifications';
import { NotificationChannelTC } from '../host/query/NotificationChannel';

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
