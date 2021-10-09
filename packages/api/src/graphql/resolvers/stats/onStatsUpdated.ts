import { EZContext } from 'graphql-ez';
import { normalizeGranularity } from '../stats/utils';
import { createSubscriptionResolver } from '../../helpers';
import { StatsGranularityEnum, StatsMetricsTypeEnum } from '../../scalars';
import { schemaComposer } from 'graphql-compose';
import { GraphQLFieldResolver } from 'graphql';
import { FieldConfig } from '../index';
import { StatsSnapshotTC } from './types';
import {
  StatsListener,
  StatisticalSnapshot,
  StatsMetricType,
} from '@alpen/core';
import { firstChar } from '@alpen/shared';

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

  // eslint-disable-next-line max-len
  function onSubscribe(
    _,
    { filter },
    { accessors }: EZContext,
  ): AsyncIterator<StatisticalSnapshot> {
    const { id, jobName, granularity, metric } = filter;
    const unit = normalizeGranularity(granularity);

    let listener: StatsListener;

    if (isHost) {
      const hostManager = accessors.getHostById(id);
      // any queue will do
      const queueId = hostManager.queueManagers?.[0].id;
      listener = accessors.getStatsListener(queueId);
    } else {
      listener = accessors.getStatsListener(id);
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
