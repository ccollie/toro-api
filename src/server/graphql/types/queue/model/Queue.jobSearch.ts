import { FieldConfig, JobStatusEnumType } from '../../../types';
import { GraphQLJSONObject, schemaComposer } from 'graphql-compose';
import { processSearch } from '../../../../queues';
import { Queue } from 'bullmq';
import { JobStatusEnum } from '../../../../../types';

const JobSearchInput = schemaComposer.createInputTC({
  name: 'JobSearchInput',
  fields: {
    status: {
      type: JobStatusEnumType,
      makeRequired: true,
      makeFieldNonNull: true,
      defaultValue: JobStatusEnum.COMPLETED,
      description: 'Search for jobs having this status',
    },
    criteria: {
      type: GraphQLJSONObject,
      makeRequired: true,
      makeFieldNonNull: true,
      description: 'A mongo-compatible filter job filter',
    },
    cursor: {
      type: 'String',
      defaultValue: null,
      description:
        'The iterator cursor. Iteration starts when the cursor is set to null, and terminates when ' +
        'the cursor returned by the server is null',
    },
    count: {
      type: 'Int!',
      defaultValue: 10,
      description: 'The maximum number of jobs to return per iteration',
    },
  },
});

export const JobSearchPayload = schemaComposer.createObjectTC({
  name: 'JobSearchPayload',
  fields: {
    cursor: {
      type: 'String',
    },
    jobs: '[Job!]!',
  },
});

export const jobSearch: FieldConfig = {
  description:
    'Incrementally iterate over a list of jobs filtered by mongo-compatible query criteria',
  type: JobSearchPayload.NonNull,
  args: {
    filter: JobSearchInput.NonNull,
  },
  async resolve(queue: Queue, { filter }) {
    const { status, criteria, cursor, count } = filter;

    const { jobs, cursor: nextCursor } = await processSearch(
      queue,
      status,
      criteria,
      cursor,
      count,
    );

    return {
      cursor: nextCursor,
      jobs,
    };
  },
};
