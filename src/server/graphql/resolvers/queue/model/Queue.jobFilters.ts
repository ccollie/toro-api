import { FieldConfig } from '../../utils';
import { getJobFilters } from '@server/queues';
import { Queue } from 'bullmq';
import { JobFilterTC } from '../../job/model/Job.filter';
import { JobFilter } from '@src/types';

export const queueJobFilters: FieldConfig = {
  type: JobFilterTC.NonNull.List.NonNull,
  args: {
    ids: '[ID!]',
  },
  async resolve(
    queue: Queue,
    { ids }: { ids?: string[] },
  ): Promise<JobFilter[]> {
    return getJobFilters(queue, ids);
  },
};
