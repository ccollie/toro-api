import {
  BaseMetric,
  MetricType,
  getByKey,
  create as createMetric,
} from '../../../../common/imports';
import { getQueueListener } from '../../helpers';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';

import { StatsWindow } from 'stats';

export type MetricsInput = {
  queueId: string;
  window?: StatsWindow;
  jobNames?: string[];
};

export function createMetricResolver(
  type: MetricType,
): GraphQLFieldResolver<any, any> {
  let metric: BaseMetric;

  function channelName(_, args: MetricsInput): string {
    const { queueId, ...options } = args;
    const ctor = getByKey(type);
    const key = (ctor as any).key;
    const names = (options.jobNames || []).sort().join(',');
    return (
      `QUEUE_${key.toUpperCase()}:${queueId}` +
      (names.length ? `:${names}` : '')
    );
  }

  async function onSubscribe(_, args: MetricsInput, context): Promise<void> {
    // todo: pass in options ?
    const { queueId, ...options } = args;
    const listener = getQueueListener(context, queueId);
    metric = createMetric(listener, type, options);

    const { pubsub, channelName } = context;
    metric.onUpdate((value) => {
      pubsub.publish(channelName, { value });
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
