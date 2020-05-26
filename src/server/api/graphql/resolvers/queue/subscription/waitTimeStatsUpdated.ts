import { createResolver } from '../../../subscription';
import { getQueueManager } from '../../helpers';
import { GraphQLFieldResolver } from 'graphql';

export function waitTimeStatsUpdated(): GraphQLFieldResolver<any, any> {
  let unregister;

  function channelName(_, { queueId, jobName }): string {
    return `WAIT_STATS_${queueId}` + (jobName ? `_${jobName}` : '');
  }

  async function onSubscribe(_, { queueId, jobName }, context): Promise<void> {
    const queueManager = getQueueManager(context, queueId);
    const { channelName, pubsub } = context;

    unregister = await queueManager.subscribeWaitTime(jobName, (message) => {
      const [, data] = message;
      const { data: ignore, ...payload } = data;
      return pubsub.publish(channelName, payload);
    });
  }

  function onUnsubscribe(): void {
    return unregister();
  }

  return createResolver({
    channelName,
    onSubscribe,
    onUnsubscribe,
  });
}
