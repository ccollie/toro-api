import { removeJobsByFilter } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { convertJobSearchStatus } from '../utils';
import { JobSearchStatus } from '../../../scalars';
import { FieldConfig } from '../../utils';

const DeleteJobsByFilterInput = schemaComposer.createInputTC({
  name: 'DeleteJobsByFilterInput',
  fields: {
    queueId: {
      type: 'ID!',
      description: 'The id of the queue',
    },
    status: {
      type: JobSearchStatus,
      makeRequired: true,
      makeFieldNonNull: true,
      defaultValue: 'completed',
      description: 'Search for jobs having this status',
    },
    expression: {
      type: 'String!',
      makeRequired: true,
      makeFieldNonNull: true,
      description: 'The job filter expression',
    },
    pattern: {
      type: 'String',
      description: 'Optional job id pattern e.g. "j[?]b-*"',
    },
    count: {
      type: 'Int',
      defaultValue: 20,
      description: 'The maximum number of jobs to remove per iteration',
    },
  },
});

export const DeleteJobsByFilterPayloadTC = schemaComposer.createObjectTC({
  name: 'DeleteJobsByFilterPayload',
  fields: {
    removed: {
      type: 'Int!',
      description: 'The number of jobs removed this iteration',
    }
  },
});

export const deleteJobsByFilter: FieldConfig = {
  description:
    'Delete jobs by filter expression',
  type: DeleteJobsByFilterPayloadTC.NonNull,
  args: {
    input: DeleteJobsByFilterInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext): Promise<{ removed: number }> => {
    const { queueId, status, expression, count, pattern } = input;
    const queue = accessors.getQueueById(queueId, true);
    const removed = await removeJobsByFilter(
      queue, {
        status: convertJobSearchStatus(status),
        filter: expression,
        count,
        pattern
      }
    );

    return {
      removed,
    };
  },
};
