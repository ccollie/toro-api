import { Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getQueueManager } from '../../../helpers';
import { getJobKeyProperties } from '@alpen/core';
import { getJobById } from './loaders';
import { EZContext } from 'graphql-ez';

export const parent: FieldConfig = {
  type: 'Job',
  description: 'Returns the parent of a job that is part of a flow',
  async resolve(child: Job, args, context: EZContext): Promise<Job> {
    if (!child.parentKey) return null;
    const { id, queueName } = getJobKeyProperties(child.parentKey);
    const { queue } = getQueueManager(queueName);
    return getJobById(context, queue, id);
  },
};
