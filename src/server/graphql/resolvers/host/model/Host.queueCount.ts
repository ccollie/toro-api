import { FieldConfig } from '../../';
import { HostManager } from '@server/hosts';

export const queueCount: FieldConfig = {
  type: 'Int!',
  description: 'The count of queues registered for this host',
  resolve: (host: HostManager): number => {
    return host.queueManagers.length;
  },
};
