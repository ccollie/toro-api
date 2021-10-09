import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { publish } from '../../../pubsub';
import { Job, Queue } from 'bullmq';

function getChannelName(queueId: string): string {
  return `queue-job-added-${queueId}`;
}

export async function publishJobAdded(
  context: EZContext,
  queue: Queue,
  job: Job | Job[],
): Promise<void> {
  const queueId = context.accessors.getQueueId(queue);
  const channelName = getChannelName(queueId);
  const queueName = queue.name;

  const items = Array.isArray(job) ? job : [job];
  items.forEach((job) => {
    const payload = {
      queueId,
      queueName,
      jobId: job.id,
      jobName: job.name,
    };
    publish(channelName, payload);
  });
}

export const onJobAdded: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnJobAddedPayload',
    fields: {
      jobId: 'String!',
      jobName: 'String!',
      queueId: 'String!',
      queueName: 'String!',
    },
  }).NonNull,
  args: {
    queueId: 'ID!',
  },
  subscribe: (_, { queueId }, context) => {
    const channel = getChannelName(queueId);
    return context.pubsub.asyncIterator(channel);
  },
};
