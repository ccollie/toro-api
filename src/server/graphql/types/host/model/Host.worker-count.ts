import { FieldConfig } from '../../utils';
import { HostManager } from '../../../../hosts';

export const hostWorkerCount: FieldConfig = {
  type: 'Int!',
  description:
    'Returns the number of workers associated with managed queues on this host',
  async resolve(host: HostManager): Promise<number> {
    const workers = await host.getWorkers();
    return workers.length;
  },
};
