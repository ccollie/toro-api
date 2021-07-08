import { deleteQueueStats } from '@server/queues';
import { FieldConfig } from '../../utils';
import { QueueTC } from '../../index';
import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { StatsGranularityEnum } from '../../../scalars';

export const queueStatsDelete: FieldConfig = {
  description: 'Delete all stats associated with a queue',
  type: schemaComposer.createObjectTC({
    name: 'QueueStatsDeletePayload',
    fields: {
      isDeleted: 'Boolean!',
      queue: QueueTC.NonNull,
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueStatsDeleteInput',
      fields: {
        queueId: 'ID!',
        jobName: {
          type: 'String',
          description:
            'Optional job name to delete stats for. If omitted, all queue stats are erased',
        },
        granularity: {
          type: StatsGranularityEnum,
          description:
            'Optional stats granularity. If omitted, the entire range of data is deleted',
        },
      },
    }).NonNull,
  },
  async resolve(_, { input }) {
    const { queueId, jobName } = input;
    const queue = await getQueueById(queueId);

    const count = await deleteQueueStats(queue, jobName);
    // exposing key count makes no sense to an end user and leaks implementation
    // details
    const isDeleted = count > 0;

    return {
      isDeleted,
      queue,
    };
  },
};
