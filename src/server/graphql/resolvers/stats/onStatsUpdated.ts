import {
  createSubscriptionResolver,
  getHostById,
  getStatsListener,
  normalizeGranularity,
} from '../../helpers';
import { firstChar } from '@lib/utils';
import { StatsGranularityEnum, StatsMetricsTypeEnum } from '../../scalars';
import { schemaComposer } from 'graphql-compose';
import { GraphQLFieldResolver } from 'graphql';
import { FieldConfig } from '../';
import { StatsSnapshotTC } from './types';
import { StatsListener } from '@server/stats';
import { StatisticalSnapshot, StatsMetricType } from '@src/types';

function getStatsUpdatedResolver(
  isHost: boolean,
): GraphQLFieldResolver<any, any> {
  function channelName(_, { filter }): string {
    const { id, jobName, granularity, metric } = filter;
    const unit = normalizeGranularity(granularity);
    const type = metric.toUpperCase();
    const base = `${isHost ? 'host' : 'queue'}.${type}_UPDATED:${id}`;
    const parts = [base];
    if (jobName) parts.push(jobName);
    if (unit) {
      parts.push(`1${firstChar(unit)}`);
    }
    return parts.join(':');
  }

  function onSubscribe(_, { filter }): AsyncIterator<StatisticalSnapshot> {
    const { id, jobName, granularity, metric } = filter;
    const unit = normalizeGranularity(granularity);

    let listener: StatsListener;

    if (isHost) {
      const hostManager = getHostById(id);
      // any queue will do
      const queueId = hostManager.queueManagers?.[0].id;
      listener = getStatsListener(queueId);
    } else {
      listener = getStatsListener(id);
    }
    return listener.onStatsUpdate(
      isHost,
      metric as StatsMetricType,
      jobName,
      unit,
    );
  }

  return createSubscriptionResolver({
    channelName,
    onSubscribe,
  });
}

const StatsUpdatedSubscriptionFilterTC = schemaComposer.createInputTC({
  name: 'StatsUpdatedSubscriptionFilter',
  description: 'Filtering options for stats subscriptions.',
  fields: {
    id: {
      type: 'ID!',
      description: 'The id of the queue or host to subscribe to',
    },
    jobName: {
      type: 'String',
      description: 'An optional job name for filtering',
    },
    metric: {
      type: StatsMetricsTypeEnum,
      makeRequired: true,
      description: 'The metric requested',
    },
    granularity: {
      type: StatsGranularityEnum,
      description: 'Data granularity',
    },
  },
});

export function onStatsUpdated(isHost: boolean): FieldConfig {
  return {
    type: StatsSnapshotTC.NonNull,
    description: `Subscribe for updates in ${
      isHost ? 'host' : 'queue'
    } statistical snapshots`,
    args: {
      input: StatsUpdatedSubscriptionFilterTC.NonNull,
    },
    subscribe: getStatsUpdatedResolver(isHost),
  };
}
