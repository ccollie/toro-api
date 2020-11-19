import { schemaComposer } from 'graphql-compose';
import { getQueueById } from '../../../helpers';
import { JobStatusEnumType } from '../../index';
import { FieldConfig } from '../../index';
import { JobStatusEnum } from '../../../../../types';
import { Duration } from '../../scalars';
import { parseDuration } from '../../../../lib/datetime';
import boom from '@hapi/boom';

export const queueClean: FieldConfig = {
  description:
    'Remove all jobs created outside of a grace interval in milliseconds. ' +
    'You can clean the jobs with the following states: COMPLETED, wait (typo for WAITING), ' +
    'isActive, DELAYED, and FAILED.',
  type: schemaComposer.createObjectTC({
    name: 'QueueCleanPayload',
    fields: {
      id: {
        type: 'ID!',
        description: 'The queue id',
      },
      jobIds: {
        type: '[ID!]',
        description: 'Returns a list of cleared job ids',
      },
    },
  }),
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueCleanFilter',
      fields: {
        id: {
          type: 'ID!',
        },
        grace: {
          type: Duration,
          makeRequired: true,
          description:
            'Grace period interval (ms). Jobs older this this will be removed. ',
        },
        status: {
          type: JobStatusEnumType,
          defaultValue: JobStatusEnum.COMPLETED,
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
    }),
  },
  resolve: async (_, { id, filter: { grace, status, limit } }) => {
    const queue = await getQueueById(id);
    const gracePeriod = parseDuration(grace);

    if (!isFinite(limit) || limit < 1) {
      throw boom.badRequest('limit must be a positive integer');
    }
    const jobIds = await queue.clean(gracePeriod, limit, status);
    return {
      id,
      jobIds,
    };
  },
};
