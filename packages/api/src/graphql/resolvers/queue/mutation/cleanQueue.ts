import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { JobStatusEnumType } from '../../index';
import { FieldConfig } from '../../index';
import { JobStatus } from '@alpen/core';
import { Duration } from '../../../scalars';
import { parseDuration } from '@alpen/shared';
import boom from '@hapi/boom';

export const cleanQueue: FieldConfig = {
  description:
    'Remove all jobs created outside of a grace interval in milliseconds. ' +
    'You can clean the jobs with the following states: COMPLETED, wait (typo for WAITING), ' +
    'isActive, DELAYED, and FAILED.',
  type: schemaComposer.createObjectTC({
    name: 'QueueCleanResult',
    fields: {
      id: {
        type: 'ID!',
        description: 'The queue id',
      },
      count: {
        type: 'Int!',
        description: 'Returns the number of affected jobs',
      },
      jobIds: {
        type: '[ID!]',
        description: 'Returns a list of cleared job ids',
      },
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueCleanInput',
      fields: {
        id: {
          type: 'ID!',
        },
        grace: {
          type: Duration,
          makeRequired: true,
          defaultValue: 0,
          description:
            'Grace period interval (ms). Jobs older this this will be removed. ',
        },
        status: {
          type: JobStatusEnumType,
          defaultValue: 'completed' as JobStatus,
          description: 'Status of the jobs to clean',
        },
        limit: {
          type: 'Int',
          defaultValue: 0,
          description:
            'limit Maximum amount of jobs to clean per call. ' +
            'If not provided will clean all matching jobs.',
        },
      },
    }).NonNull,
  },
  resolve: async (
    _,
    { input: { id, grace, status, limit } },
    { accessors }: EZContext,
  ) => {
    const queue = accessors.getQueueById(id, true);
    const gracePeriod = parseDuration(grace);

    if (!isFinite(limit) || limit < 1) {
      throw boom.badRequest('limit must be a positive integer');
    }
    const jobIds = await queue.clean(gracePeriod, limit, status);
    return {
      id,
      count: jobIds.length,
      jobIds,
    };
  },
};