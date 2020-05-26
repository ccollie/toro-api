import { getQueueManager } from '../../helpers';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';

export function jobDeleted(): GraphQLFieldResolver<any, any> {
  let unsub;

  async function cleanup(): Promise<void> {
    if (unsub) {
      await unsub();
      unsub = null;
    }
  }

  function getChannelName(_, { queueId, jobId }): string {
    return `JOB_DELETED_${queueId}_${jobId}`;
  }

  // TODO: would it be better to simply use keyspace notifications ?
  async function onSubscribe(_, { queueId, jobId }, context) {
    const queueManager = getQueueManager(context, queueId);
    const { channelName, pubsub } = context;
    const event = `job.${jobId}`;

    const handler = async ({ event }): Promise<void> => {
      if (event === 'removed') {
        const payload = {
          queueId,
          jobId,
        };
        await pubsub.publish(channelName, payload);
        await cleanup();
      }
    };
    unsub = queueManager.queueListener.on(event, handler);
  }

  async function onUnsubscribe(): Promise<void> {
    return cleanup();
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}
