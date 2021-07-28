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
import { jobMemoryAvg, jobMemoryUsage } from './Queue.jobMemoryAvg';
import { waitTimeAvg } from './Queue.waitTimeAvg';
import { queueHostName as host } from './Queue.host';
import { queueWorkerCount as workerCount } from './Queue.worker-count';
import { queueHostId as hostId } from './Queue.host-id';
import { queueJobSchemas as jobSchemas } from './Queue.jobSchemas';
import { queueRules as rules } from './Queue.rules';
import { pendingJobCount } from './Queue.pendingJobCount';
import { queueJobFilters as jobFilters } from './Queue.jobFilters';
import { jobSearch } from './Queue.jobSearch';
import { jobsByFilter } from './Queue.jobsByFilter';
import { ruleAlertCount } from './Queue.ruleAlertCount';
import { ruleAlerts } from './Queue.ruleAlerts';
import { jobsById } from './Queue.jobsById';
import { queueMetrics as metrics } from './Queue.metrics';
import { metricCount } from './Queue.metricCount';
import { waitingCount } from './Queue.waitingCount';
import { waitingChildrenCount } from './Queue.waitingChildrenCount';

import {
  histogram,
  percentileDistribution,
  stats,
  statsAggregate,
  statsDateRange,
  statsLatest as lastStatsSnapshot,
  getQueueRatesResolver,
} from '../../stats';
import { StatsRateType } from '@alpen/core';

const throughput = getQueueRatesResolver(StatsRateType.Throughput);
const errorRate = getQueueRatesResolver(StatsRateType.Errors);
const errorPercentageRate = getQueueRatesResolver(
  StatsRateType.ErrorPercentage,
);

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
    jobSearch,
    jobsByFilter,
    jobDurationAvg,
    jobMemoryAvg,
    jobMemoryUsage,
    lastStatsSnapshot,
    metrics,
    metricCount,
    pendingJobCount,
    percentileDistribution,
    repeatableJobs,
    repeatableJobCount,
    ruleAlertCount,
    ruleAlerts,
    jobs,
    jobsById,
    rules,
    stats,
    statsAggregate,
    statsDateRange,
    throughput,
    errorRate,
    errorPercentageRate,
    waitingCount,
    waitingChildrenCount,
    waitTimeAvg,
    workers,
    workerCount,
  },
});
