import { Job, Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getJobKeyProperties } from '@alpen/core';
import { EZContext } from 'graphql-ez';

export const parentQueue: FieldConfig = {
  type: 'Queue',
  description: 'Returns the parent queue of a job that is part of a flow',
  async resolve(
    child: Job,
    args: unknown,
    { accessors }: EZContext,
  ): Promise<Queue> {
    if (!child.parentKey) return null;
    const { queueName } = getJobKeyProperties(child.parentKey);
    const { queue } = accessors.getQueueManager(queueName);
    return queue;
  },
};
