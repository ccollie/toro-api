import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getJobCountByType } from './loaders';
import { Context } from '@server/graphql';
import { JobStatusEnum } from '@src/types';

export const pendingJobCount: FieldConfig = {
  type: 'Int!',
  description: 'Returns the number of jobs waiting to be processed.',
  resolve(queue: Queue, args, context: Context): Promise<number> {
    return getJobCountByType(
      context,
      queue,
      JobStatusEnum.WAITING,
      JobStatusEnum.PAUSED,
      JobStatusEnum.DELAYED,
    );
  },
};
