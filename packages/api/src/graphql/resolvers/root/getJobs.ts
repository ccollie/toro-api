import { Job } from 'bullmq';
import type { JobState } from 'bullmq';
import { EZContext } from 'graphql-ez';
import {
  SortOrderEnum,
  OrderEnumType,
  JobState as GqlJobState,
} from '../../scalars';
import { FieldConfig } from '../utils';
import { schemaComposer } from 'graphql-compose';
import { GetJobsInput } from '../../typings';

export const getJobs: FieldConfig = {
  type: '[Job!]!',
  args: {
    input: schemaComposer.createInputTC({
      name: 'GetJobsInput',
      fields: {
        queueId: {
          type: 'ID!',
        },
        offset: {
          type: 'Int',
          defaultValue: 0,
        },
        limit: {
          type: 'Int',
          defaultValue: 10,
        },
        status: {
          type: GqlJobState,
          defaultValue: 'completed',
        },
        sortOrder: {
          type: OrderEnumType,
          defaultValue: SortOrderEnum.ASC,
        },
      },
    }).NonNull,
  },
  async resolve(
    _,
    { input }: { input: GetJobsInput },
    { accessors }: EZContext,
  ): Promise<Job[]> {
    const {
      queueId,
      offset = 0,
      limit = 10,
      status,
      sortOrder = SortOrderEnum.DESC,
    } = input || {};
    const asc = sortOrder.toLowerCase() === 'asc';
    const manager = accessors.getQueueManager(queueId);
    // TODO: fix the cast
    const _status: JobState =
      (status === 'waiting_children' ? 'waiting-children' : status) as JobState;
    const statuses = [_status];
    return manager.getJobs(statuses, offset, limit, asc);
  },
};
