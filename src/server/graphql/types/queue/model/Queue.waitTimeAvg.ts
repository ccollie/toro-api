import { ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { Queue } from 'bullmq';
import { Scripts } from '../../../../commands/scripts';
import { JobStatusEnum } from '../../../../../types';

export const waitTimeAvg: ObjectTypeComposerFieldConfigDefinition<any, any> = {
  type: 'Int!',
  description:
    'Get the average time a job spends in the queue before being processed',
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
    return Scripts.getAvgWaitTime(
      queue,
      jobName,
      JobStatusEnum.COMPLETED,
      limit,
    );
  },
};
