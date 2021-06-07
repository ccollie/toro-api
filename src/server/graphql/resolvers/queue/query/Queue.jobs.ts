import { Queue } from 'bullmq';
import { SortOrderEnum, OrderEnumType, JobStatusEnumType } from '../../scalars';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { JobStatusEnum } from '../../../../../types';
import { JobTC } from '../../job/query/Job';

export const queueJobs: FieldConfig = {
  type: JobTC.NonNull.List.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueJobsInput',
      fields: {
        offset: {
          type: 'Int',
          defaultValue: 0,
        },
        limit: {
          type: 'Int',
          defaultValue: 10,
        },
        status: {
          type: JobStatusEnumType,
          defaultValue: JobStatusEnum.COMPLETED,
        },
        sortOrder: {
          type: OrderEnumType,
          defaultValue: SortOrderEnum.ASC,
        },
      },
    }),
  },
  async resolve(queue: Queue, { input }): Promise<any> {
    const {
      offset = 0,
      limit = 10,
      status,
      sortOrder = SortOrderEnum.DESC,
    } = input || {};
    const asc = sortOrder.toLowerCase() === 'asc';
    const manager = getQueueManager(queue);
    // todo: check out requested fields. If "states" is requested
    // use the optimized method to get states in bulk
    return manager.getJobs(status, offset, limit, asc);
  },
};
