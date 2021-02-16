import { StatsRateQueryInputTC } from './types';
import { aggregateRates, getClient } from './utils';
import { MeterTC } from './MeterTC';
import {
  MeterSummary,
  StatsGranularity,
  StatsRateType,
} from '../../../../types';
import { FieldConfig } from '../../types';
import { Queue } from 'bullmq';
import { getStatsListener } from '../../helpers';
import { QueueStats } from '../../../stats';
import boom from '@hapi/boom';
import { HostManager } from '../../../hosts';

export function getQueueRatesResolver(type: StatsRateType): FieldConfig {
  function getInstantRate(queue: Queue, jobName?: string) {
    const listener = getStatsListener(queue);
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
    async resolve(queue: Queue, { input }) {
      if (!input) {
        return getInstantRate(queue);
      }
      const { jobName, granularity, range } = input;
      return aggregateRates(queue, jobName, range, granularity, type);
    },
  };
}

export function getHostRatesResolver(type: StatsRateType): FieldConfig {
  function getRates(
    host: HostManager,
    jobName: string,
    range: string,
    granularity: StatsGranularity,
  ) {
    return aggregateRates(host, jobName, range, granularity, type);
  }

  return {
    type: MeterTC.NonNull,
    description: `Gets the current job ${type} rates for a host based on an exponential moving average`,
    args: {
      input: StatsRateQueryInputTC,
    },
    async resolve(_, { input }): Promise<MeterSummary> {
      if (!input) {
        let range = 'last_minute';
        const client = getClient(_);
        const timeSpan = await client.getHostSpan(
          null,
          'latency',
          StatsGranularity.Minute,
        );
        if (timeSpan) {
          range = `${timeSpan.start}-${timeSpan.end}`;
        }
        return getRates(_, null, range, StatsGranularity.Minute);
      }
      const { jobName, granularity, range = 'last_minute' } = input;
      return getRates(_, jobName, range, granularity);
    },
  };
}
