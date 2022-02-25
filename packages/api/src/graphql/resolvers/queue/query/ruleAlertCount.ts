import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';

export const ruleAlertCount: FieldConfig = {
  type: 'Int!',
  description: 'Returns the count of rule alerts associated with a Queue',
  args: {},
  async resolve(queue: Queue, _, context): Promise<number> {
    return context.loaders.queueAlertCount.load(queue);
  },
};
