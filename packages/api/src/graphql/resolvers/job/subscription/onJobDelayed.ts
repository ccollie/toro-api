import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { JobTC, QueueTC, FieldConfig } from '../../index';

export const onJobDelayed: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnJobDelayedPayload',
    fields: {
      job: JobTC,
      queue: QueueTC.NonNull,
      jobId: 'String!',
      delay: 'Int',
    },
  }).NonNull,
  args: {
    prefix: {
      type: 'String!',
      defaultValue: 'bull',
    },
    queueId: 'ID!',
  },
  resolve: async ({ jobId, delay }, { queueId }, { accessors }: EZContext) => {
    const queue = accessors.getQueueById(queueId);
    const job = await queue.getJob(jobId);
    return {
      job,
      queue,
      jobId,
      delay: parseInt(delay),
    };
  },
  subscribe: (_, { queueId }, { accessors }: EZContext) => {
    return accessors.getAsyncIterator(queueId, 'delayed');
  },
};
