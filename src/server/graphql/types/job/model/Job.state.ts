import { Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getState } from '../../../helpers';

export const jobStateFC: FieldConfig = {
  type: 'JobStatus!',
  async resolve(parent: Job): Promise<string> {
    return getState(parent);
  },
};
