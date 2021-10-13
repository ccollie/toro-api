import { GraphQLFieldResolver } from 'graphql';
import { EZContext } from 'graphql-ez';
import { createSharedSubscriptionResolver } from '../../../pubsub';
import boom from '@hapi/boom';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { TimeseriesDataPoint } from '@alpen/core/stats';

export type MetricsInput = {
  queueId: string;
  metricId: string;
};

// TODO: to review
// TODO: monitor metric state. unsubscribe if removed
// todo: add option to debounce update
function createResolver(): GraphQLFieldResolver<any, any> {
  function channelName(_, args: MetricsInput): string {
    const { queueId, metricId } = args;
    return `QUEUE:${queueId}:m:${metricId}`;
  }

  function onSubscribe(
    _,
    args: MetricsInput,
    { accessors }: EZContext,
  ): AsyncIterator<TimeseriesDataPoint> {
    const { queueId, metricId } = args;
    const mgr = accessors.getQueueManager(queueId);
    const metric = mgr.metricManager.metrics.find((x) => x.id === metricId);
    if (!metric) {
      throw boom.badRequest(`No metric found with id "${metricId}"`);
    }
    return metric.createValueIterator();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  function onUnsubscribe(): void {}

  return createSharedSubscriptionResolver({
    channelName,
    onSubscribe,
    onUnsubscribe,
  });
}

export const onQueueMetricValueUpdated: FieldConfig = {
  type: schemaComposer.createObjectTC({
    description: 'Returns a stream of metric data updates',
    name: 'OnQueueMetricValueUpdated',
    fields: {
      queueId: 'String!',
      value: 'Float!',
      ts: {
        type: 'Date!',
        description: 'The timestamp of the time the value was recorded',
      },
    },
  }).NonNull,
  args: {
    queueId: 'String!',
    metricId: 'String!',
  },
  subscribe: createResolver(),
};
