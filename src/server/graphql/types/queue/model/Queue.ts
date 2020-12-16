import { Queue } from 'bullmq';
import { jobCounts } from './Queue.jobCounts';
import { queueWorkers as workers } from './Queue.workers';
import { schemaComposer } from 'graphql-compose';
import { repeatableJobCount, repeatableJobs } from './Queue.repeatables';
import { queueJobs as jobs } from './Queue.jobs';
import { queueId } from './Queue.id';
import { isPaused } from './Queue.isPaused';
import { jobNames } from './Queue.jobNames';
import { jobDurationAvg } from './Queue.jobDurationAvg';
import { jobMemoryAvg } from './Queue.jobMemoryAvg';
import { waitTimeAvg } from './Queue.waitTimeAvg';
import { queueHostName as host } from './Queue.host';
import { queueWorkerCount as workerCount } from './Queue.worker-count';
import { queueHostId as hostId } from './Queue.host-id';
import { queueJobSchemas as jobSchemas } from './Queue.jobSchemas';
import { queueRules as rules } from './Queue.rules';
import { pendingJobCount } from './Queue.pendingJobCount';
import { queueJobFilters as jobFilters } from './Queue.jobFilters';
import { getRatesResolver } from './rates';
import {
  histogram,
  percentileDistribution,
  stats,
  statsLatest as lastStatsSnapshot,
  statsDateRange,
} from '../../stats';

const throughput = getRatesResolver('completed');
const errorRate = getRatesResolver('error');

export const QueueTC = schemaComposer.createObjectTC({
  name: 'Queue',
  fields: {
    id: queueId,
    prefix: {
      type: 'String!',
      resolve: (queue: Queue) => {
        return queue.opts.prefix;
      },
    },
    name: 'String!',
    histogram,
    host,
    hostId,
    isPaused,
    jobCounts,
    jobNames,
    jobFilters,
    jobSchemas,
    jobDurationAvg,
    jobMemoryAvg,
    waitTimeAvg,
    lastStatsSnapshot,
    pendingJobCount,
    percentileDistribution,
    repeatableJobs,
    repeatableJobCount,
    jobs,
    rules,
    stats,
    statsDateRange,
    throughput,
    errorRate,
    workers,
    workerCount,
  },
});
