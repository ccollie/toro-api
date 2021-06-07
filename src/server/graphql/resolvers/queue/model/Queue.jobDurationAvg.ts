import { ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { Queue } from 'bullmq';
import { Scripts } from '@server/commands/scripts';
import { JobStatusEnum } from '@src/types';

export const jobDurationAvg: ObjectTypeComposerFieldConfigDefinition<any, any> =
  {
    type: 'Int!',
    description:
      'Get the average runtime duration of completed jobs in the queue',
    args: {
      jobName: {
        type: 'String',
        description: 'Consider only jobs of this type (optional)',
      },
      limit: {
        type: 'Int',
        description: 'An optional upper limit of jobs to use in the average',
        defaultValue: 1000,
      },
    },
    resolve: async (queue: Queue, { limit, jobName }) => {
      return Scripts.getAvgJobDuration(
        queue,
        jobName,
        JobStatusEnum.COMPLETED,
        limit,
      );
    },
  };
