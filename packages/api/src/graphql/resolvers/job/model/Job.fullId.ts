import boom from '@hapi/boom';
import { Job } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const jobFullIdFC: FieldConfig = {
  type: 'String!',
  makeNonNull: true,
  description:
    'Returns the fully qualified id of a job, including the queue prefix and queue name',
  async resolve(job: Job, _, { accessors }: EZContext): Promise<string> {
    const queue = accessors.getJobQueue(job);
    if (queue) {
      const prefix = queue.opts.prefix;
      return `${prefix}:${job.queueName}:${job.id}`;
    }
    throw boom.notFound('Unexpected. Cannot find queue for job');
  },
};
