import { Job } from 'bullmq';
import { JobStatusEnumType } from '../../scalars';
import { FieldConfig } from '../../utils';
import { getState } from '../../../helpers';

export const jobStateFC: FieldConfig = {
  type: JobStatusEnumType,
  async resolve(parent: Job): Promise<string> {
    return getState(parent);
  },
};
