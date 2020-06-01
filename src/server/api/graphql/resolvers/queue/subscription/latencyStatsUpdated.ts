import { createResolver } from '../../../subscription';
import { getQueueManager } from '../../helpers';
import { GraphQLFieldResolver } from 'graphql';

export function latencyStatsUpdated(): GraphQLFieldResolver<any, any> {
  let unregister;

  function channelName(_, { queueId, jobName, granularity }): string {
    const parts: string[] = [`LATENCY_STATS:${queueId}`];
    if (jobName) parts.push(`j:${jobName}`);
    if (granularity) parts.push(`g:${granularity}`);
    return parts.join('_');
  }

  async function onSubscribe(
    _,
    { queueId, jobName, granularity },
    context,
  ): Promise<void> {
    const queueManager = getQueueManager(context, queueId);
    const { channelName, pubsub } = context;

    unregister = await queueManager.subscribeLatency(
      jobName,
      granularity,
      (message) => {
        const [, data] = message;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: ignore, ...payload } = data;
        return pubsub.publish(channelName, payload);
      },
    );
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
