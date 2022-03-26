import { removeJobsByFilter } from '@alpen/core';
import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { JobType } from '../../../scalars';
import { FieldConfig } from '../../utils';

const DeleteJobsByFilterInput = schemaComposer.createInputTC({
  name: 'DeleteJobsByFilterInput',
  fields: {
    status: {
      type: JobType,
      makeRequired: true,
      makeFieldNonNull: true,
      defaultValue: 'completed',
      description: 'Search for jobs having this status',
    },
    criteria: {
      type: 'String',
      makeRequired: true,
      makeFieldNonNull: true,
      description: 'The job filter expression',
    },
    cursor: {
      type: 'Int',
      defaultValue: null,
      description:
        'The iterator cursor. Iteration starts when the cursor is set to null, ' +
        'and terminates when the cursor returned by the server is null',
    },
    count: {
      type: 'Int!',
      defaultValue: 10,
      description: 'The maximum number of jobs to remove per iteration',
    },
  },
});

export const DeleteJobsByFilterPayloadTC = schemaComposer.createObjectTC({
  name: 'DeleteJobsByFilterPayload',
  fields: {
    cursor: {
      type: 'Int',
    },
    total: {
      type: 'Int!',
      description: 'The total number of jobs to be removed',
    },
    removed: {
      type: 'Int!',
      description: 'The number of jobs removed this iteration',
    }
  },
});

export const deleteJobsByFilter: FieldConfig = {
  description:
    'Incrementally delete jobs filtered by query criteria',
  type: DeleteJobsByFilterPayloadTC.NonNull,
  args: {
    filter: DeleteJobsByFilterInput.NonNull,
  },
  async resolve(queue: Queue, { filter }) {
    const { status, criteria, cursor, count } = filter;

    const {
      cursor: nextCursor,
      total,
      removed = 0,
    } = await removeJobsByFilter(
      queue,
      status,
      criteria,
      null, // hash
      cursor,
      count,
    );

    return {
      cursor: nextCursor,
      total,
      removed,
    };
  },
};
