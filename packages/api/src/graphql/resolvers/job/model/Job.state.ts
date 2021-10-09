import { Job } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const jobStateFC: FieldConfig = {
  type: 'JobStatus!',
  async resolve(job: Job, args, context: EZContext): Promise<string> {
    return context.loaders.jobState.load(job);
  },
};
