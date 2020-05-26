import { JobRateMetric } from '../../../../common/imports';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';

export function jobRateChanged(): GraphQLFieldResolver<any, any> {
  let metric = null;

  function getChannelName(_, { queueId }): string {
    return `JOB_RATE:${queueId}`;
  }

  function onSubscribe(_, args, context): void {
    const { queueId } = args;
    const channel = getChannelName(_, args);
    const { pubsub, supervisor } = context;
    const queueListener = supervisor.getQueueById(queueId);
    metric = new JobRateMetric(queueListener);

    metric.onUpdate((rate: number) => {
      pubsub.publish(channel, { rate });
    });
  }

  async function onUnsubscribe(): Promise<void> {
    metric && metric.destroy();
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}
