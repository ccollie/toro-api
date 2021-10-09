import { EZContext } from 'graphql-ez';
import { QueueTC, FieldConfig } from '../index';
import { Queue } from 'bullmq';

export const queue: FieldConfig = {
  type: QueueTC,
  description: 'Get a queue by id',
  args: {
    id: 'ID!',
  },
  resolve(_, { id }, { accessors }: EZContext): Queue {
    return accessors.getQueueById(id);
  },
};
