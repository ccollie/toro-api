import { removeJobsByPattern } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { convertJobSearchStatus } from '../utils';
import { JobSearchStatus } from '../../../scalars';
import { FieldConfig } from '../../utils';

const DeleteJobsByPatternInput = schemaComposer.createInputTC({
  name: 'DeleteJobsByPatternInput',
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
      description: 'Filter by jobs having this status',
    },
    pattern: {
      type: 'String',
      makeRequired: true,
      makeFieldNonNull: true,
      description: 'The job pattern. e.g uploads:*',
    },
    countPerIteration: {
      type: 'Int',
      defaultValue: 10,
      description: 'The maximum number of jobs to remove per iteration',
    },
  },
});

export const DeleteJobsByPatternPayloadTC = schemaComposer.createObjectTC({
  name: 'DeleteJobsByPatternPayload',
  fields: {
    removed: {
      type: 'Int!',
      description: 'The number of jobs removed this iteration',
    }
  },
});

export const deleteJobsByPattern: FieldConfig = {
  description:
    'Incrementally delete jobs filtered by pattern',
  type: DeleteJobsByPatternPayloadTC.NonNull,
  args: {
    input: DeleteJobsByPatternInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext): Promise<{ removed: number }> => {
    const { queueId, status: _status, pattern, countPerIteration } = input;
    const queue = accessors.getQueueById(queueId, true);
    const status = convertJobSearchStatus(_status);
    const removed = await removeJobsByPattern(queue, {
      status,
      pattern,
      count: countPerIteration
    });
    return { removed };
  },
};
