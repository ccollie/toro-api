import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getQueueAlertCount } from '@server/graphql/loaders/queue-alert-count';

export const ruleAlertCount: FieldConfig = {
  type: 'Int!',
  description: 'Returns the count of rule alerts associated with a Queue',
  args: {},
  async resolve(queue: Queue, _, { loaders }): Promise<number> {
    return getQueueAlertCount(loaders, queue);
  },
};
