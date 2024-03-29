import { Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getQueueManager } from '../../../helpers';
import { getJobKeyProperties } from '@server/queues';
import { getJobById } from './loaders';
import { Context } from '@server/graphql';

export const parent: FieldConfig = {
  type: 'Job',
  description: 'Returns the parent of a job that is part of a flow',
  async resolve(child: Job, args, context: Context): Promise<Job> {
    if (!child.parentKey) return null;
    const { id, queueName } = getJobKeyProperties(child.parentKey);
    const { queue } = getQueueManager(queueName);
    return getJobById(context, queue, id);
  },
};
