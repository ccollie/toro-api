import { Job } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { JobState } from '../../../scalars';

export const jobStateFC: FieldConfig = {
  type: JobState,
  async resolve(job: Job, args, context: EZContext): Promise<string> {
    return context.loaders.jobState.load(job);
  },
};
