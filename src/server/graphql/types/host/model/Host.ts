import { schemaComposer } from 'graphql-compose';
import { QueueTC } from '../../queue/model/Queue';
import { Queue } from 'bullmq';
import { HostManager } from '../../../../hosts';
import { hostRedisFC as redis } from './Host.redis';
import { hostChannelsFC as channels } from './Host.channels';
import {
  histogram,
  percentileDistribution,
  stats,
  statsLatest as lastStatsSnapshot,
  statsDateRange,
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
    queues: {
      type: QueueTC.NonNull.List.NonNull,
      description: 'The queues registered for this host',
      resolve: (host: HostManager): Queue[] => {
        return host.getQueues();
      },
    },
    channels,
    histogram,
    lastStatsSnapshot,
    percentileDistribution,
    redis,
    stats,
    statsDateRange,
  },
});
