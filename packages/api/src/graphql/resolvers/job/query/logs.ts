import { Job, Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';

export const logs: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobLogs',
    fields: {
      count: 'Int!',
      messages: '[String!]!',
    },
  }).NonNull,
  args: {
    start: {
      type: 'Int!',
      defaultValue: 0,
    },
    end: {
      type: 'Int!',
      defaultValue: -1,
    },
  },
  resolve: async (job: Job, { start, end }) => {
    // `queue` is private property of Job instance
    // so here we are not guaranteed that log will be available in the future
    const queue = (job as any).queue as Queue<any>;
    const { logs: messages, count } = await queue.getJobLogs(job.id, start, end);
    return {
      messages,
      count,
    };
  },
};
