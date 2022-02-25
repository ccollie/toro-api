import { processSearch } from '@alpen/core';
import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { JobStatusEnumType } from '../../../scalars';
import { FieldConfig } from '../../utils';

const JobSearchInputTC = schemaComposer.createInputTC({
  name: 'JobSearchInput',
  fields: {
    status: {
      type: JobStatusEnumType,
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
      type: 'String',
      defaultValue: null,
      description:
        'The iterator cursor. Iteration starts when the cursor is set to null, ' +
        'and terminates when the cursor returned by the server is null',
    },
    count: {
      type: 'Int!',
      defaultValue: 10,
      description: 'The maximum number of jobs to return per iteration',
    },
  },
});

export const JobSearchPayloadTC = schemaComposer.createObjectTC({
  name: 'JobSearchPayload',
  fields: {
    cursor: {
      type: 'String',
    },
    hasNext: 'Boolean!',
    jobs: '[Job!]!',
    total: 'Int!',
    current: 'Int!',
  },
});

export const jobSearch: FieldConfig = {
  description:
    'Incrementally iterate over a list of jobs filtered by query criteria',
  type: JobSearchPayloadTC.NonNull,
  args: {
    filter: JobSearchInputTC.NonNull,
  },
  async resolve(queue: Queue, { filter }) {
    const { status, criteria, cursor, count } = filter;

    const {
      jobs,
      cursor: nextCursor,
      total,
      current,
    } = await processSearch(
      queue,
      status,
      criteria,
      null, // hash
      cursor,
      count,
    );

    return {
      cursor: nextCursor,
      hasNext: !!(nextCursor && nextCursor.length),
      jobs,
      total,
      current,
    };
  },
};
