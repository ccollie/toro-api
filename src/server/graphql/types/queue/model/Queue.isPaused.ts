import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';

export const isPaused: FieldConfig = {
  type: 'Boolean!',
  resolve: async (queue: Queue) => {
    return queue.isPaused();
  },
};
