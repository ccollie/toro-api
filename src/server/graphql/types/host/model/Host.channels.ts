import { HostManager } from '../../../../hosts';
import { NotificationChannelTC } from './NotificationChannel';
import { FieldConfig } from '../../utils';

export const hostChannelsFC: FieldConfig = {
  type: NotificationChannelTC.NonNull.List.NonNull,
  description: 'Notification channels for alerts',
  async resolve(host: HostManager): Promise<any[]> {
    return host.getChannels();
  },
};
