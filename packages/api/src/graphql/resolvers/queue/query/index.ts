import { StatsRateType } from '@alpen/core';
import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';

import {
  getQueueRatesResolver,
  histogram,
  percentileDistribution,
  stats,
  statsAggregate,
  statsDateRange,
  statsLatest as lastStatsSnapshot,
} from '../../stats';
import { config } from './config';
import { defaultJobOptions } from './defaultJobOptions';
import { queueHostName as host } from './host';
import { hostId } from './host-id';
import { id } from './id';
import { isPaused } from './isPaused';
import { isReadonly } from './isReadonly';
import { jobCounts } from './jobCounts';
import { jobDurationAvg } from './jobDurationAvg';
import { jobFilters } from './jobFilters';
import { jobMemoryAvg, jobMemoryUsage } from './jobMemoryAvg';
import { jobNames } from './jobNames';
import { jobs } from './jobs';
import { jobsByFilter } from './jobsByFilter';
import { jobsById } from './jobsById';
import { jobSchemas } from './jobSchemas';
import { jobSearch } from './jobSearch';
import { limiter } from './limiter';
import { metricCount } from './metricCount';
import { metrics } from './metrics';
import { metricsData } from './metricsDateRange';
import { pendingJobCount } from './pendingJobCount';
import { repeatableJobCount, repeatableJobs } from './repeatables';
import { ruleAlertCount } from './ruleAlertCount';
import { ruleAlerts } from './ruleAlerts';
import { rules } from './rules';
import { schedulerCount } from './scheduler-count';
import { schedulers } from './schedulers';
import { waitingChildrenCount } from './waitingChildrenCount';
import { waitingCount } from './waitingCount';
import { waitTimeAvg } from './waitTimeAvg';
import { workerCount } from './worker-count';
import { workers } from './workers';

const throughput = getQueueRatesResolver(StatsRateType.Throughput);
const errorRate = getQueueRatesResolver(StatsRateType.Errors);
const errorPercentageRate = getQueueRatesResolver(
  StatsRateType.ErrorPercentage,
);

export const QueueTC = schemaComposer.createObjectTC({
  name: 'Queue',
  fields: {
    id: id,
    prefix: {
      type: 'String!',
      resolve: (queue: Queue) => {
        return queue.opts.prefix;
      },
    },
    config: config,
    defaultJobOptions,
    name: 'String!',
    histogram,
    host,
    hostId,
    isPaused,
    isReadonly,
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
    limiter,
    metrics,
    metricCount,
    metricsData,
    pendingJobCount,
    percentileDistribution,
    repeatableJobs,
    repeatableJobCount,
    ruleAlertCount,
    ruleAlerts,
    jobs,
    jobsById,
    rules,
    schedulers,
    schedulerCount,
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
