import { FieldConfig } from '../../utils';
import { getJobFilters, JobFilter } from '@alpen/core';
import { Queue } from 'bullmq';
import { JobFilterTC } from '../../job/query/filter';

export const jobFilters: FieldConfig = {
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
