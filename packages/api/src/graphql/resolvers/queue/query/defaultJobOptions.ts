import { JobsOptions, Queue } from 'bullmq';
import { JobOptionsTC } from '../../job/query/opts';
import { FieldConfig } from '../../utils';

export const defaultJobOptions: FieldConfig = {
  type: JobOptionsTC,
  description: 'Returns the current default job options of the specified queue.',
  resolve: (queue: Queue): JobsOptions => {
    return queue.defaultJobOptions;
  },
};
