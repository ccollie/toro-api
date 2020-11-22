import { FieldConfig } from '../../utils';
import { getJobFilters } from '../../../../queues';
import { Queue } from 'bullmq';
import { JobFilterTC } from '../../job/model/Job.filter';
import { JobFilter } from '../../../../../types';

export const queueJobFilters: FieldConfig = {
  type: JobFilterTC.List.NonNull,
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
