import { schemaComposer } from 'graphql-compose';
import { jobStateFC } from './Job.state';
import { JobOptionsTC } from './Job.opts';
import { jobQueueIdFC } from './Job.queueId';
import { jobLogs } from './Job.logs';
import { JobProgress } from '../../../scalars';
import { Job } from 'bullmq';
import { dependencies } from './Job.dependencies';
import { dependenciesCount } from './Job.dependenciesCount';
import { parent } from './Job.parent';
import { JobStatusEnum } from '@src/types';
import { Context } from '@server/graphql';
import { checkState } from './loaders';

export const JobOptionsInputTC =
  JobOptionsTC.getITC().setTypeName('JobOptionsInput');

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
    parentKey: 'String',
    logs: jobLogs,
    isInFlow: {
      description:
        'Returns true if this job is either a parent or child node in a flow.',
      type: 'Boolean!',
      async resolve(job: Job): Promise<boolean> {
        if (job.parentKey) return true;
        // todo: move to loader
        // see if we have children
        const values = await job.getDependenciesCount();
        return values.processed + values.unprocessed > 0;
      },
    },
    isWaiting: {
      type: 'Boolean!',
      description: 'returns true if this job is waiting.',
      resolve(job: Job, args, context: Context): Promise<boolean> {
        return checkState(
          context,
          job,
          JobStatusEnum.WAITING,
          JobStatusEnum.PAUSED,
        );
      },
    },
    isWaitingChildren: {
      type: 'Boolean!',
      description: 'returns true if this job is waiting for children.',
      resolve(job: Job, args, context: Context): Promise<boolean> {
        return checkState(context, job, JobStatusEnum.WAITING_CHILDREN);
      },
    },
    childrenValues: {
      type: 'JSONObject!',
      description:
        'Get this jobs children result values as an object indexed by job key, if any.',
      async resolve(job: Job): Promise<Record<string, any>> {
        const values = await job.getChildrenValues();
        return values ?? Object.create(null);
      },
    },
    parent,
    dependencies,
    dependenciesCount,
  },
});
