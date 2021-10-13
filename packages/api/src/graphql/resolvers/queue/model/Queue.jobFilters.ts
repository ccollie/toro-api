import { FieldConfig } from '../../utils';
import { getJobFilters, JobFilter } from '@alpen/core/queues';
import { Queue } from 'bullmq';
import { JobFilterTC } from '../../job/model/Job.filter';

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
