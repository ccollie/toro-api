import { schemaComposer } from 'graphql-compose';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../index';
import { publish } from '../../../pubsub';
import { Job, Queue } from 'bullmq';

function getChannelName(queueId: string): string {
  return `queue-job-added-${queueId}`;
}

function getQueueId(queue: Queue): string {
  const manager = getQueueManager(queue);
  return manager.id;
}

export async function publishJobAdded(
  queue: Queue,
  job: Job | Job[],
): Promise<void> {
  const queueId = getQueueId(queue);
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
