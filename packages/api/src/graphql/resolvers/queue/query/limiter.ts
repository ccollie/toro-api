import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '../../utils';

const LimiterTC = schemaComposer.createObjectTC({
  name: 'QueueLimiter',
  fields: {
    groupKey: {
      type: 'String',
    },
  },
});


export const limiter: FieldConfig = {
  type: LimiterTC,
  resolve: async (queue: Queue) => {
    return queue.limiter;
  },
};
