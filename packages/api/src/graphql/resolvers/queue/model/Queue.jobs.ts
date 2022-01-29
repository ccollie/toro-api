import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import {
  SortOrderEnum,
  OrderEnumType,
  JobStatusEnumType,
} from '../../../scalars';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { JobTC } from '../../job/model/Job';
import { QueueJobsInput } from '../../../typings';

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
          defaultValue: 'completed',
        },
        sortOrder: {
          type: OrderEnumType,
          defaultValue: SortOrderEnum.ASC,
        },
      },
    }),
  },
  async resolve(
    queue: Queue,
    { input }, //: { input: QueueJobsInput },
    { accessors }: EZContext,
  ): Promise<any> {
    const {
      offset = 0,
      limit = 10,
      status,
      sortOrder = SortOrderEnum.DESC,
    } = input || {};
    const asc = sortOrder.toLowerCase() === 'asc';
    const manager = accessors.getQueueManager(queue);
    // todo: check out requested fields. If "states" is requested
    // use the optimized method to get states in bulk
    return manager.getJobs(status, offset, limit, asc);
  },
};
