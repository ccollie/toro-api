import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
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
        count: {
          type: 'Int',
          description: 'number to limit how many jobs will be moved to wait status per iteration',
        },
      },
    }).NonNull,
  },
  resolve: async (
    _,
    { input: { queueId, count } },
    { publish, accessors }: EZContext,
  ) => {
    // enforce a minimum count for efficiency
    count = typeof count === 'number' ? Math.max(50, count) : undefined;
    const queue = accessors.getQueueById(queueId, true) as Queue;
    const failedCount = await queue.getFailedCount();
    await queue.retryJobs(count ? { count } : undefined);

    const queueName = queue.name;
    const payload = {
      queueId,
      queueName,
      count: failedCount,
    };

    const eventName = `${JOBS_RETRIED_PREFIX}${queueId}`;
    publish(eventName, payload);

    return payload;
  },
};
