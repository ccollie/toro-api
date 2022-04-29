import { schemaComposer } from 'graphql-compose';
import { queues } from './queues';
import { metrics } from './metrics';
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
  stats,
  statsLatest as lastStatsSnapshot,
  statsDateRange,
} from '../../stats';

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
    jobCounts,
    lastStatsSnapshot,
    metrics,
    name: {
      type: 'String!',
      description: 'The name of the host',
    },
    ping,
    queues,
    queueCount,
    redis,
    stats,
    statsDateRange,
    uri,
    workerCount,
    workers,
  },
});
