import { createResolver } from '../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { getStatsClient, normalizeGranularity } from '../helpers';
import { StatisticalSnapshot, StatsMetricType } from 'stats';
import { firstChar, StatsClient } from '../../imports';

interface StatsUpdateFilter {
  queueId: string;
  jobName?: string;
  granularity?: string;
}

function statsUpdated(type: StatsMetricType): GraphQLFieldResolver<any, any> {
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

  function onSubscribe(
    _,
    { filter },
    context,
  ): AsyncIterator<StatisticalSnapshot> {
    const { queueId, jobName, granularity: g } = filter;
    const granularity = normalizeGranularity(g);

    const client: StatsClient = getStatsClient(context, queueId);

    if (type === 'latency') {
      return client.latencyStatsUpdateIterator(jobName, granularity);
    } else {
      return client.waitTimeStatsUpdateIterator(jobName, granularity);
    }
  }

  return createResolver({
    channelName,
    onSubscribe,
  });
}

function latencyStatsUpdated(): GraphQLFieldResolver<any, any> {
  return statsUpdated('latency');
}

function waitTimeStatsUpdated(): GraphQLFieldResolver<any, any> {
  return statsUpdated('wait');
}

export const Subscription = {
  latencyStatsUpdated: {
    subscribe: latencyStatsUpdated(),
  },
  waitTimeStatsUpdated: {
    subscribe: waitTimeStatsUpdated(),
  },
};
