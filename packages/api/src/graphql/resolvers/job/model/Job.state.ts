import { Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getJobState } from './loaders';

export const jobStateFC: FieldConfig = {
  type: 'JobStatus!',
  async resolve(job: Job, args, context): Promise<string> {
    return getJobState(context, job);
  },
};
