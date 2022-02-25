import { schemaComposer } from 'graphql-compose';
import { queues } from './queues';
import { workerCount } from './worker-count';
import { workers as workers } from './workers';
import { jobCounts } from './job-counts';
import { queueCount } from './queueCount';
import { hostRedisFC as redis } from './redis';
import { hostChannelsFC as channels } from './channels';
import { discoverQueues } from './discoverQueues';
import { alertCount } from './alert-count';
import { ping } from './ping';
import { uri } from './uri';

import {
  histogram,
  percentileDistribution,
  stats,
  statsLatest as lastStatsSnapshot,
  statsDateRange,
  statsAggregate,
  getHostRatesResolver,
} from '../../stats';

import { StatsRateType } from '@alpen/core';

const throughput = getHostRatesResolver(StatsRateType.Throughput);
const errorRate = getHostRatesResolver(StatsRateType.Errors);
const errorPercentageRate = getHostRatesResolver(StatsRateType.ErrorPercentage);

export const HostTC = schemaComposer.createObjectTC({
  name: 'QueueHost',
  fields: {
    id: 'ID!',
    alertCount,
    channels,
    description: {
      type: 'String',
      description: 'An optional description of the host',
    },
    discoverQueues,
    errorPercentageRate,
    errorRate,
    histogram,
    jobCounts,
    lastStatsSnapshot,
    name: {
      type: 'String!',
      description: 'The name of the host',
    },
    percentileDistribution,
    ping,
    queues,
    queueCount,
    redis,
    stats,
    statsAggregate,
    statsDateRange,
    throughput,
    uri,
    workerCount,
    workers,
  },
});
