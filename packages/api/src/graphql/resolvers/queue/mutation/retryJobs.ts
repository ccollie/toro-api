import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FinishedStatus } from '../../../scalars';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { JOBS_RETRIED_PREFIX } from '../../../helpers';

export const retryJobs: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RetryJobsPayload',
    fields: {
      count: {
        type: 'Int',
        description: 'the number of retried jobs',
      },
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'RetryJobsInput',
      fields: {
        queueId: {
          type: 'ID!',
          description: 'The id of the queue',
        },
        state: {
          type: FinishedStatus,
          defaultValue: 'failed',
          description: 'Job status to consider. Defaults to failed.',
        },
        count: {
          type: 'Int',
          description: 'number to limit how many jobs will be moved to wait status per iteration',
        },
        timestamp: {
          type: 'Int',
          description: 'retry all failed jobs before the given timestamp',
        },
      },
    }).NonNull,
  },
  resolve: async (
    _,
    { input: { queueId, count, state } },
    { publish, accessors }: EZContext,
  ) => {
    // enforce a minimum count for efficiency
    count = typeof count === 'number' ? Math.max(50, count) : undefined;
    const queue = accessors.getQueueById(queueId, true) as Queue;
    const failedCount = await queue.getFailedCount();
    const opts = { state, count };
    await queue.retryJobs(opts);

    const queueName = queue.name;
    const payload = {
      queueId,
      queueName,
      state,
      count: failedCount,
    };

    const eventName = `${JOBS_RETRIED_PREFIX}${queueId}`;
    publish(eventName, payload);

    return payload;
  },
};
