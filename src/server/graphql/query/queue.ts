import { QueueTC, FieldConfig } from '../types';
import { getQueueById } from '../helpers';
import { Queue } from 'bullmq';

export const queue: FieldConfig = {
  type: QueueTC,
  description: 'Get a queue by id',
  args: {
    id: 'ID!',
  },
  resolve(_, { id }): Queue {
    return getQueueById(id);
  },
};
