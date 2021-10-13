import { EZContext } from 'graphql-ez';
import { StatsRateQueryInputTC } from './types';
import { aggregateRates, getClient } from './utils';
import { MeterTC } from './MeterTC';
import {
  MeterSummary,
  QueueStats,
} from '@alpen/core/stats';
import { StatsRateType, StatsGranularity } from '@alpen/core/stats';
import { HostManager } from '@alpen/core/hosts';
import { FieldConfig } from '../index';
import { Queue } from 'bullmq';
import boom from '@hapi/boom';

export function getQueueRatesResolver(type: StatsRateType): FieldConfig {
  function getInstantRate(context: EZContext, queue: Queue, jobName?: string) {
    const listener = context.accessors.getStatsListener(queue);
    const stats: QueueStats = jobName
      ? listener.getJobNameStats(jobName)
      : listener.queueStats;
    if (!stats) {
      let msg = 'No stats found';
      if (jobName) {
        msg = `No stats found for job name "${jobName}"`;
      }
      throw boom.notFound(msg);
    }
    switch (type) {
      case StatsRateType.ErrorPercentage:
        return stats.errorPercentage.getSummary();
      case StatsRateType.Errors:
        return stats.errors.getSummary();
      case StatsRateType.Throughput:
        return stats.getThroughputRateSummary();
    }
  }

  return {
    type: MeterTC.NonNull,
    description: `Gets the current job ${type} rates based on an exponential moving average`,
    args: {
      input: StatsRateQueryInputTC,
    },
    async resolve(queue: Queue, { input }, context: EZContext) {
      if (!input) {
        return getInstantRate(context, queue);
      }
      const { jobName, granularity, range } = input;
      return aggregateRates(context, queue, jobName, range, granularity, type);
    },
  };
}

export function getHostRatesResolver(type: StatsRateType): FieldConfig {
  function getRates(
    context: EZContext,
    host: HostManager,
    jobName: string,
    range: string,
    granularity: StatsGranularity,
  ) {
    return aggregateRates(context, host, jobName, range, granularity, type);
  }

  return {
    type: MeterTC.NonNull,
    // eslint-disable-next-line max-len
    description: `Gets the current job ${type} rates for a host based on an exponential moving average`,
    args: {
      input: StatsRateQueryInputTC,
    },
    async resolve(_, { input }, context: EZContext): Promise<MeterSummary> {
      if (!input) {
        let range = 'last_minute';
        const client = getClient(context, _);
        const timeSpan = await client.getHostSpan(
          null,
          'latency',
          StatsGranularity.Minute,
        );
        if (timeSpan) {
          range = `${timeSpan.startTime}-${timeSpan.endTime}`;
        }
        return getRates(context, _, null, range, StatsGranularity.Minute);
      }
      const { jobName, granularity, range = 'last_minute' } = input;
      return getRates(context, _, jobName, range, granularity);
    },
  };
}
