import { schemaComposer } from 'graphql-compose';
import { getAsyncIterator, getQueueById } from '../../../helpers';
import { JobTC, QueueTC, FieldConfig } from '../../index';

export const onJobDelayed: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnJobDelayedPayload',
    fields: {
      job: JobTC,
      queue: QueueTC.NonNull,
      jobId: 'String!',
      queueName: 'String!',
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
  resolve: async ({ jobId, delay }, { queueId }) => {
    const queue = getQueueById(queueId);
    const job = await queue.getJob(jobId);
    return {
      job,
      queue,
      jobId,
      queueName: queue.name,
      delay: parseInt(delay),
    };
  },
  subscribe: (_, { queueId }) => {
    return getAsyncIterator(queueId, 'delayed');
  },
};
