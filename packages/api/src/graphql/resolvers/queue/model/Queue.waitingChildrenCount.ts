import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getJobCountByType } from './loaders';
import { JobStatusEnum } from '@alpen/core';

export const waitingChildrenCount: FieldConfig = {
  type: 'Int!',
  description: 'Returns the number of child jobs waiting to be processed.',
  resolve(queue: Queue): Promise<number> {
    return getJobCountByType(
      queue,
      JobStatusEnum.WAITING_CHILDREN,
      JobStatusEnum.PAUSED,
    );
  },
};
