import { Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getJobKeyProperties } from '@alpen/core/queues';
import { EZContext } from 'graphql-ez';

export const parent: FieldConfig = {
  type: 'Job',
  description: 'Returns the parent of a job that is part of a flow',
  async resolve(child: Job, args: unknown, context: EZContext): Promise<Job> {
    if (!child.parentKey) return null;
    const { id, queueName } = getJobKeyProperties(child.parentKey);
    const { queue } = context.accessors.getQueueManager(queueName);
    return context.loaders.jobById.load({ queue, id });
  },
};
