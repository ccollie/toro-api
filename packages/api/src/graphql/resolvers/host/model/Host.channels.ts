import { HostManager } from '@alpen/core/hosts';
import { NotificationChannelTC } from '../scalars';
import { FieldConfig } from '../../utils';

export const hostChannelsFC: FieldConfig = {
  type: NotificationChannelTC.NonNull.List.NonNull,
  description: 'Notification channels for alerts',
  async resolve(host: HostManager): Promise<any[]> {
    return host.getChannels();
  },
};
