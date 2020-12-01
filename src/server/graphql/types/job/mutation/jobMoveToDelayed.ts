import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { Duration } from '../../scalars';
import boom from '@hapi/boom';

export const jobMoveToDelayed: FieldConfig = {
  description: 'Moves job from active to delayed.',
  type: schemaComposer.createObjectTC({
    name: 'JobMoveToDelayedPayload',
    fields: {
      job: JobTC.NonNull,
      delay: 'Int!',
      executeAt: {
        type: 'Date!',
        description: 'Estimated date/time of execution',
      },
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'JobMoveToDelayedInput',
      fields: {
        queueId: {
          type: 'ID!',
        },
        jobId: 'String!',
        delay: {
          type: Duration,
          description: 'The amount of time to delay execution (in ms)',
          defaultValue: 60000,
        },
      },
    }),
  },
  resolve: async (_, { input }) => {
    const { queueId, jobId, delay } = input;
    const queue = await getQueueById(queueId);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw boom.notFound('Job not found!');
    }
    const executeAt = Date.now() + delay;
    await job.moveToDelayed(executeAt);
    return {
      executeAt,
      delay,
      job,
    };
  },
};
