import { schemaComposer } from 'graphql-compose';
import { hostQueues as queues } from './Host.queues';
import { hostRedisFC as redis } from './Host.redis';
import { hostChannelsFC as channels } from './Host.channels';
import { discoverQueues } from './Host.discoverQueues';
import { ping } from './Host.ping';
import {
  histogram,
  percentileDistribution,
  stats,
  statsLatest as lastStatsSnapshot,
  statsDateRange,
  statsAggregate,
} from '../../stats';

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
    channels,
    discoverQueues,
    histogram,
    lastStatsSnapshot,
    percentileDistribution,
    ping,
    redis,
    stats,
    statsAggregate,
    statsDateRange,
  },
});
