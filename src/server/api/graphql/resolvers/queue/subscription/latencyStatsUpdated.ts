import { createResolver } from '../../../subscription';
import { getQueueManager } from '../../helpers';
import { GraphQLFieldResolver } from 'graphql';

export function latencyStatsUpdated(): GraphQLFieldResolver<any, any> {
  let unregister;

  function channelName(_, { queueId, jobName }): string {
    return `LATENCY_STATS:${queueId}` + (jobName ? `_${jobName}` : '');
  }

  async function onSubscribe(_, { queueId, jobName }, context): Promise<void> {
    const queueManager = getQueueManager(context, queueId);
    const { channelName, pubsub } = context;

    unregister = await queueManager.subscribeLatency(jobName, (message) => {
      const [, data] = message;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
