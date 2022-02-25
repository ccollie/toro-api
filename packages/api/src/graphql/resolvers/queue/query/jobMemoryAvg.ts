import {
  ObjectTypeComposerFieldConfigDefinition,
  schemaComposer,
} from 'graphql-compose';
import { Queue } from 'bullmq';
import {
  getJobMemoryAvg,
  getJobMemoryUsage
} from '@alpen/core';
import { JobStatusEnumType } from '../../../scalars';

export const JobMemoryAvgInputTC = schemaComposer.createInputTC({
  name: 'JobsMemoryAvgInput',
  fields: {
    status: {
      type: JobStatusEnumType,
      description: 'Job status to consider. Defaults to completed.',
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
  resolve: async (queue: Queue, args) => {
    const {
      limit = 50,
      jobName,
      status = 'completed',
    } = args || {};
    return getJobMemoryAvg(queue, status, limit, jobName);
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
    resolve: async (queue: Queue, args) => {
      const {
        limit = 50,
        jobName,
        status = 'completed',
      } = args || {};
      const { byteCount, jobCount } = await getJobMemoryUsage(
        queue,
        status,
        limit,
        jobName,
      );

      return { byteCount, jobCount };
    },
  };
