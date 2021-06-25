import {
  ObjectTypeComposerFieldConfigDefinition,
  schemaComposer,
} from 'graphql-compose';
import { Queue } from 'bullmq';
import { JobStatusEnum } from '@src/types';
import {
  getJobMemoryAvg,
  getJobMemoryUsage,
} from '@server/graphql/loaders/job-memory';
import { ResolverContext } from '@server/graphql';
import { JobStatusEnumType } from '@server/graphql/resolvers';

export const JobMemoryAvgInputTC = schemaComposer.createInputTC({
  name: 'JobsMemoryAvgInput',
  fields: {
    status: {
      type: JobStatusEnumType,
      description: 'Job status to consider. Defaults to COMPLETED',
    },
    jobName: {
      type: 'String',
      description: 'Consider only jobs of this type (optional)',
    },
    limit: {
      type: 'Int',
      description: 'An optional upper limit of jobs to sample for the average',
      defaultValue: 50,
    },
  },
});

export const jobMemoryAvg: ObjectTypeComposerFieldConfigDefinition<any, any> = {
  type: 'Float!',
  description: 'Get the average memory used by jobs in the queue',
  args: {
    input: JobMemoryAvgInputTC,
  },
  resolve: async (queue: Queue, args, context: ResolverContext) => {
    const {
      limit = 50,
      jobName,
      status = JobStatusEnum.COMPLETED,
    } = args || {};
    return getJobMemoryAvg(context.loaders, queue, status, limit, jobName);
  },
};

const JobMemoryUsagePayloadTC = schemaComposer.createObjectTC({
  name: 'JobMemoryUsagePayload',
  fields: {
    byteCount: {
      type: 'Int!',
      description: 'The total number of bytes consumed by the sampled jobs',
    },
    jobCount: {
      type: 'Int!',
      description: 'The total number of jobs contributing to the byteCount',
    },
  },
});

export const jobMemoryUsage: ObjectTypeComposerFieldConfigDefinition<any, any> =
  {
    type: JobMemoryUsagePayloadTC.NonNull,
    description: 'Get the average memory used by jobs in the queue',
    args: {
      input: JobMemoryAvgInputTC,
    },
    resolve: async (queue: Queue, args, context: ResolverContext) => {
      const {
        limit = 50,
        jobName,
        status = JobStatusEnum.COMPLETED,
      } = args || {};
      const { byteCount, jobCount } = await getJobMemoryUsage(
        context.loaders,
        queue,
        status,
        limit,
        jobName,
      );

      return { byteCount, jobCount };
    },
  };
