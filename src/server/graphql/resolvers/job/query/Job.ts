import { schemaComposer } from 'graphql-compose';
import { jobStateFC } from './Job.state';
import { JobOptionsTC } from './Job.opts';
import { jobQueueIdFC } from './Job.queueId';
import { jobLogs } from './Job.logs';
import { JobProgress } from '../../scalars';
import { Job } from 'bullmq';

export const JobOptionsInputTC = JobOptionsTC.getITC().setTypeName(
  'JobOptionsInput',
);

export const JobTC = schemaComposer.createObjectTC({
  name: 'Job',
  fields: {
    id: 'ID!',
    name: 'String!',
    data: 'JSONObject!',
    progress: JobProgress,
    delay: {
      type: 'Int!',
      resolve(parent: Job): number {
        return parent.opts.delay || 0;
      },
    },
    timestamp: 'Date!',
    attemptsMade: 'Int!',
    failedReason: 'JSON',
    stacktrace: {
      type: '[String!]!',
      resolve(parent: Job): string[] {
        return parent.stacktrace || [];
      },
    },
    returnvalue: 'JSON',
    finishedOn: 'Date',
    processedOn: 'Date',
    opts: {
      type: JobOptionsTC.NonNull,
    },
    state: jobStateFC,
    queueId: jobQueueIdFC,
    logs: jobLogs,
  },
});
