import { Queue } from 'bullmq';
import { get } from 'lodash';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '../../utils';
import { JobStatusEnum } from '../../../../../types';


export const pendingJobCount: FieldConfig = {
  type: 'Int!',
  description: 'Returns the number of jobs waiting to be processed.',
  async resolve(queue: Queue): Promise<number> {
    return queue.count();
  },
};
