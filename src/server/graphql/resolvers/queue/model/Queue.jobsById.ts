import { Queue } from 'bullmq';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { JobTC } from '../../job/model/Job';

export const jobsById: FieldConfig = {
  type: JobTC.NonNull.List.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueJobsByIdInput',
      fields: {
        ids: '[ID!]!',
      },
    }),
  },
  async resolve(queue: Queue, { input }): Promise<any> {
    const { ids = [] } = input;
    const manager = getQueueManager(queue);
    // todo: use loader to take advantage of caching
    // todo: check out requested fields. If "states" is requested
    // use the optimized method to get states in bulk
    return manager.getMultipleJobsById(ids);
  },
};
