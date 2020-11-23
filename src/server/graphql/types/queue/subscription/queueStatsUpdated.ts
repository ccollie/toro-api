import { GraphQLFieldResolver } from 'graphql';
import { StatisticalSnapshot, StatsMetricType } from '../../../../../types';
import {
  createSubscriptionResolver,
  getStatsClient,
  normalizeGranularity,
} from '../../../helpers';
import { StatsClient } from '../../../../stats';
import { firstChar } from '../../../../lib';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { JobStatsSnapshotTC } from '../../stats';
import { StatsGranularityEnum } from '../../scalars';

export function statsUpdated(
  type: StatsMetricType,
): GraphQLFieldResolver<any, any> {
  function channelName(_, { filter }): string {
    const { queueId, jobName, granularity: g } = filter;
    const granularity = normalizeGranularity(g);
    const base = `${type.toUpperCase()}_UPDATED:${queueId}`;
    const parts = [base];
    if (jobName) parts.push(jobName);
    if (granularity) {
      parts.push(`1${firstChar(granularity)}`);
    }
    return parts.join(':');
  }

  function onSubscribe(_, { filter }): AsyncIterator<StatisticalSnapshot> {
    const { queueId, jobName, granularity: g } = filter;
    const granularity = normalizeGranularity(g);

    const client: StatsClient = getStatsClient(queueId);

    if (type === 'latency') {
      return client.latencyStatsUpdateIterator(jobName, granularity);
    } else {
      return client.waitTimeStatsUpdateIterator(jobName, granularity);
    }
  }

  return createSubscriptionResolver({
    channelName,
    onSubscribe,
  });
}

export function latencyStatsUpdated(): GraphQLFieldResolver<any, any> {
  return statsUpdated('latency');
}

export function waitTimeStatsUpdated(): GraphQLFieldResolver<any, any> {
  return statsUpdated('wait');
}

const JobStatsUpdateFilterTC = schemaComposer.createInputTC({
  name: 'JobStatsSubscriptionFilter',
  description: 'Filtering options for queue stats subscriptions.',
  fields: {
    queueId: {
      type: 'ID!',
      description: 'The id of the queue',
    },
    jobName: {
      type: 'String!',
      description: 'An optional job name for filtering',
    },
    granularity: {
      type: StatsGranularityEnum,
      description: 'Data granularity',
    },
  },
});

export function getQueueStatsUpdateFC(type: StatsMetricType): FieldConfig {
  const statsName = type === 'wait' ? 'wait time' : 'latency';
  return {
    type: JobStatsSnapshotTC.NonNull,
    description: `Subscribe for updates in job ${statsName} statistical snapshots`,
    args: {
      input: JobStatsUpdateFilterTC.NonNull,
    },
    subscribe: statsUpdated(type),
  };
}
