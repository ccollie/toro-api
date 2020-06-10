import { createResolver } from '../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { getStatsClient, normalizeGranularity } from '../helpers';
import { StatsMetricType } from 'stats';
import { firstChar, StatsClient } from '../../../common/imports';

interface StatsUpdateFilter {
  queueId: string;
  jobName?: string;
  granularity?: string;
}

function statsUpdated(type: StatsMetricType): GraphQLFieldResolver<any, any> {
  let unsub: Function;

  function getChannelName(_, { filter }): string {
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

  async function onSubscribe(_, { filter }, context): Promise<void> {
    const { channelName, pubsub } = context;
    const { queueId, jobName, granularity: g } = filter;
    const granularity = normalizeGranularity(g);

    const client: StatsClient = getStatsClient(context, queueId);

    function handler(snapshot): Promise<void> {
      return pubsub.publish(channelName, snapshot);
    }

    if (type === 'latency') {
      unsub = await client.onLatencyStatsUpdated(jobName, granularity, handler);
    } else {
      unsub = await client.onWaitTimeStatsUpdated(
        jobName,
        granularity,
        handler,
      );
    }
  }

  async function onUnsubscribe(): Promise<void> {
    return unsub && unsub();
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
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
