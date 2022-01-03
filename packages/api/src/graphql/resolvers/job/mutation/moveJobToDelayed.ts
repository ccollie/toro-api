import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { Duration } from '../../../scalars';
import boom from '@hapi/boom';

export const moveJobToDelayed: FieldConfig = {
  description: 'Moves job from active to delayed.',
  type: schemaComposer.createObjectTC({
    name: 'MoveJobToDelayedResult',
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
      name: 'MoveJobToDelayedInput',
      fields: {
        queueId: {
          type: 'ID!',
        },
        jobId: 'ID!',
        delay: {
          type: Duration,
          description: 'The amount of time to delay execution (in ms)',
          defaultValue: 60000,
        },
      },
    }),
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId, delay } = input;
    const queue = accessors.getQueueById(queueId, true);
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
