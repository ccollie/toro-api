import { Queue } from 'bullmq';
import { get } from 'lodash';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '../../utils';
import { JobStatusEnum } from '../../../../../types';

export const JobCountsTC = schemaComposer.createObjectTC({
  name: 'JobCounts',
  fields: {
    [JobStatusEnum.COMPLETED]: 'Int!',
    [JobStatusEnum.FAILED]: 'Int!',
    [JobStatusEnum.DELAYED]: 'Int!',
    [JobStatusEnum.ACTIVE]: 'Int!',
    [JobStatusEnum.WAITING]: 'Int!',
    [JobStatusEnum.PAUSED]: 'Int!',
  },
});

export const jobCounts: FieldConfig = {
  type: JobCountsTC.NonNull,
  async resolve(
    queue: Queue,
    args: unknown,
    ctx: Record<string, any>,
    info: unknown,
  ): Promise<Record<string, number>> {
    // get field names/states
    const fields = get(info, 'fieldNodes[0].selectionSet.selections', []);
    const states = fields.map((node) => node.name.value);
    return queue.getJobCounts(...states);
  },
};
