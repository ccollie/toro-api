import {
  BaseMetric,
  createMetric,
  MetricTypeEnum,
  getMetricByKey,
  StatsWindow,
} from '../../../imports';
import { getRuleManager, createSubscriptionResolver } from '../../../helpers';
import { GraphQLFieldResolver } from 'graphql';

export type MetricsInput = {
  queueId: string;
  window?: StatsWindow;
  jobNames?: string[];
};

export function createMetricResolver(
  type: MetricTypeEnum,
): GraphQLFieldResolver<any, any> {
  let metric: BaseMetric;

  function channelName(_, args: MetricsInput): string {
    const { queueId, ...options } = args;
    const ctor = getMetricByKey(type);
    const key = (ctor as any).key;
    const names = (options.jobNames || []).sort().join(',');
    return (
      `QUEUE_${key.toUpperCase()}:${queueId}` +
      (names.length ? `:${names}` : '')
    );
  }

  function onSubscribe(_, args: MetricsInput): AsyncIterator<number> {
    const { queueId, ...options } = args;
    const rules = getRuleManager(queueId);
    const listener = rules.metricsListener;
    metric = createMetric(type, options);
    metric.init(listener);
    return metric.createValueIterator();
  }

  function onUnsubscribe(): void {
    metric.destroy();
  }

  return createSubscriptionResolver({
    channelName,
    onSubscribe,
    onUnsubscribe,
  });
}
