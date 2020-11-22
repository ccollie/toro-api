import { Queue } from 'bullmq';
import { jobCounts } from './Queue.jobCounts';
import { queueWorkers } from './Queue.workers';
import { schemaComposer } from 'graphql-compose';
import { repeatableJobCount, repeatableJobs } from './Queue.repeatables';
import { queueJobs } from './Queue.jobs';
import { queueId } from './Queue.id';
import { isPaused } from './Queue.isPaused';
import { jobNames } from './Queue.jobNames';
import { queueHostName } from './Queue.host';
import { queueWorkerCount } from './Queue.worker-count';
import { queueHostId } from './Queue.host-id';
import { queueJobSchemas } from './Queue.jobSchemas';
import { queueRules } from './Queue.rules';
import { pendingJobCount } from './Queue.pendingJobCount';
import { queueJobFilters } from './Queue.jobFilters';

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
    host: queueHostName,
    hostId: queueHostId,
    isPaused,
    jobCounts,
    jobNames,
    jobFilters: queueJobFilters,
    jobSchemas: queueJobSchemas,
    pendingJobCount,
    repeatableJobs,
    repeatableJobCount,
    jobs: queueJobs,
    // jobsMemoryUsageAvg: createJobsMemoryUsageAvgFC(sc),
    rules: queueRules,
    workers: queueWorkers,
    workerCount: queueWorkerCount,
  },
});
