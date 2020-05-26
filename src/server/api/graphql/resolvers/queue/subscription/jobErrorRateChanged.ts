import { ErrorRateMetric } from '../../../../common/imports';
import { getQueueListener } from '../../helpers';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';

export function jobErrorRateChanged(): GraphQLFieldResolver<any, any> {
  let metric: ErrorRateMetric;

  function channelName(_, { queueId }): string {
    return `QUEUE_ERROR_RATE:${queueId}`;
  }

  async function onSubscribe(_, { queueId }, context): Promise<void> {
    // todo: pass in options ?
    const listener = getQueueListener(context, queueId);
    const { pubsub, channelName } = context;
    metric = new ErrorRateMetric(listener);
    metric.onUpdate((value) => {
      pubsub.publish(channelName, { rate: value });
    });
  }

  function onUnsubscribe(): void {
    metric.destroy();
  }

  return createResolver({
    channelName,
    onSubscribe,
    onUnsubscribe,
  });
}
