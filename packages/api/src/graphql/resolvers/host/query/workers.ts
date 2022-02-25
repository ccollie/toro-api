import { HostManager, QueueWorker } from '@alpen/core';
import { FieldConfig } from '../../utils';

export const workers: FieldConfig = {
  args: {
    limit: 'Int',
  },
  type: '[QueueWorker!]!',
  async resolve(host: HostManager, { limit }): Promise<QueueWorker[]> {
    let workers = await host.getWorkers();
    workers = workers.sort((a, b) => a.idle - b.idle);
    if (limit) {
      const _limit = parseInt(limit);
      workers = limit > 0 ? workers.slice(0, _limit - 1) : workers;
    }
    return workers;
  },
};
