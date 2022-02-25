import { Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getJobKeyProperties } from '@alpen/core';
import { EZContext } from 'graphql-ez';

export const parent: FieldConfig = {
  type: 'Job',
  description: 'Returns the parent of a job that is part of a flow',
  async resolve(
    child: Job,
    args: unknown,
    { accessors, loaders }: EZContext,
  ): Promise<Job> {
    if (!child.parentKey) return null;
    const { id, queueName } = getJobKeyProperties(child.parentKey);
    const { queue } = accessors.getQueueManager(queueName);
    return loaders.jobById.load({ queue, id });
  },
};
