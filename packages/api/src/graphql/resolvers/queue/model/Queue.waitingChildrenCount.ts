import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getJobCountByType } from './loaders';
import { JobStatusEnum } from '@alpen/core';
import { EZContext } from 'graphql-ez';

export const waitingChildrenCount: FieldConfig = {
  type: 'Int!',
  description: 'Returns the number of child jobs waiting to be processed.',
  resolve(queue: Queue, args, context: EZContext): Promise<number> {
    return getJobCountByType(
      context,
      queue,
      JobStatusEnum.WAITING_CHILDREN,
      JobStatusEnum.PAUSED,
    );
  },
};
