import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';

export const pendingJobCount: FieldConfig = {
  type: 'Int!',
  description: 'Returns the number of jobs waiting to be processed.',
  async resolve(queue: Queue): Promise<number> {
    return queue.count();
  },
};
