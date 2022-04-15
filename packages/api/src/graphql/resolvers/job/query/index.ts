import { schemaComposer } from 'graphql-compose';
import { jobStateFC } from './state';
import { JobOptionsTC } from './opts';
import { jobFullIdFC } from './fullId';
import { jobQueueIdFC } from './queueId';
import { logs } from './logs';
import { JobProgress } from '../../../scalars';
import { Job } from 'bullmq';
import { dependencies } from './dependencies';
import { dependenciesCount } from './dependenciesCount';
import { parent } from './parent';
import { parentQueue } from './parentQueue';
import { checkState } from './loaders';
import { EZContext } from 'graphql-ez';

export const JobOptionsInputTC =
  JobOptionsTC.getITC().setTypeName('JobOptionsInput');

export const JobTC = schemaComposer.createObjectTC({
  name: 'Job',
  fields: {
    id: 'ID!',
    name: 'String!',
    data: 'JSONObject!',
    progress: {
      type: JobProgress,
      description: 'The progress a job has performed so far.',
    },
    delay: {
      type: 'Int!',
      resolve(parent: Job): number {
        return parent.opts.delay || 0;
      },
    },
    timestamp: {
      type: 'Date!',
      // eslint-disable-next-line max-len
      description:
        'Timestamp when the job was added to the queue (unless overridden with job options).',
    },
    attemptsMade: {
      type: 'Int!',
      description: 'Number of attempts after the job has failed.',
    },
    failedReason: {
      type: 'JSON',
      description: 'The reason why the job failed.',
    },
    stacktrace: {
      type: '[String!]!',
      description: 'Stacktrace for the error (for failed jobs).',
      resolve(parent: Job): string[] {
        return parent.stacktrace || [];
      },
    },
    returnvalue: {
      type: 'JSON',
      description:
        'The value returned by the processor when processing this job.',
    },
    finishedOn: {
      type: 'Date',
      description: 'Timestamp when the job was finished (completed or failed).',
    },
    processedOn: {
      type: 'Date',
      description: 'Timestamp when the job was processed.',
    },
    opts: {
      type: JobOptionsTC.NonNull,
    },
    state: jobStateFC,
    fullId: jobFullIdFC,
    queueId: jobQueueIdFC,
    queueName: {
      type: 'String!',
      description: 'The name of the queue this job belongs to',
      resolve(parent: Job): string {
        return parent.queueName;
      },
    },
    parentKey: {
      type: 'String',
      description:
        'Fully qualified key (including the queue prefix) pointing to the parent of this job.',
    },
    logs: logs,
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
      resolve(job: Job, args, context): Promise<boolean> {
        return checkState(context, job, 'waiting', 'paused');
      },
    },
    isWaitingChildren: {
      type: 'Boolean!',
      description: 'returns true if this job is waiting for children.',
      resolve(job: Job, args, context: EZContext): Promise<boolean> {
        return checkState(context, job, 'waiting-children');
      },
    },
    childrenValues: {
      type: 'JSONObject!',
      description:
        'Get this jobs children result values as an object indexed by job key, if any.',
      async resolve(job: Job): Promise<Record<string, any>> {
        const empty = Object.create(null);
        if (job.parentKey) {
          const values = await job.getChildrenValues();
          return values ?? empty;
        }
        return empty;
      },
    },
    parent,
    parentQueue,
    dependencies,
    dependenciesCount,
  },
});
