import { schemaComposer } from 'graphql-compose';
import { hostQueues as queues } from './Host.queues';
import { hostWorkerCount as workerCount } from './Host.worker-count';
import { hostWorkers as workers } from './Host.workers';
import { jobCounts } from './Host.job-counts';
import { queueCount } from './Host.queueCount';
import { hostRedisFC as redis } from './Host.redis';
import { hostChannelsFC as channels } from './Host.channels';
import { discoverQueues } from './Host.discoverQueues';
import { ping } from './Host.ping';
import { hostUri as uri } from './Host.uri';

import {
  histogram,
  percentileDistribution,
  stats,
  statsLatest as lastStatsSnapshot,
  statsDateRange,
  statsAggregate,
  getHostRatesResolver,
} from '../../stats';

import { StatsRateType } from '../../../../../types';

const throughput = getHostRatesResolver(StatsRateType.Throughput);
const errorRate = getHostRatesResolver(StatsRateType.Errors);
const errorPercentageRate = getHostRatesResolver(StatsRateType.ErrorPercentage);

export const HostTC = schemaComposer.createObjectTC({
  name: 'QueueHost',
  fields: {
    id: 'ID!',
    name: {
      type: 'String!',
      description: 'The name of the host',
    },
    description: {
      type: 'String',
      description: 'An optional description of the host',
    },
    queues,
    queueCount,
    channels,
    discoverQueues,
    errorPercentageRate,
    errorRate,
    histogram,
    jobCounts,
    lastStatsSnapshot,
    percentileDistribution,
    ping,
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
