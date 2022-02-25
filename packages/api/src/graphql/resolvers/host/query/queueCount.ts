import { FieldConfig } from '../../index';
import { HostManager } from '@alpen/core';

export const queueCount: FieldConfig = {
  type: 'Int!',
  description: 'The count of queues registered for this host',
  resolve: (host: HostManager): number => {
    return host.queueManagers.length;
  },
};
