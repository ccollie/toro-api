import { FieldConfig } from '../../utils';
import { HostManager } from '@alpen/core';

export const workerCount: FieldConfig = {
  type: 'Int!',
  description:
    'Returns the number of workers associated with managed queues on this host',
  async resolve(host: HostManager): Promise<number> {
    const workers = await host.getWorkers();
    return workers.length;
  },
};