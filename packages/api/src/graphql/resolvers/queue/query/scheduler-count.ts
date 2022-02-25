import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';

export const schedulerCount: FieldConfig = {
  args: {},
  type: 'Int!',
  async resolve(queue: Queue): Promise<number> {
    const res = await queue.getQueueSchedulers();
    return res.length;
  },
};
