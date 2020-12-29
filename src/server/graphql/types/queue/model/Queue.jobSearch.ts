import { FieldConfig, JobStatusEnumType } from '../../../types';
import { GraphQLJSONObject, schemaComposer } from 'graphql-compose';
import { Scripts, FilteredJobsResult } from '../../../../commands/scripts';
import { Queue } from 'bullmq';

const JobSearchInput = schemaComposer.createInputTC({
  name: 'JobSearchInput',
  fields: {
    status: {
      type: JobStatusEnumType,
      makeRequired: true,
      makeFieldNonNull: true,
      description: 'Search for jobs having this status',
    },
    criteria: {
      type: GraphQLJSONObject,
      makeRequired: true,
      makeFieldNonNull: true,
      description: 'A mongo-compatible filter job filter',
    },
    cursor: {
      type: 'Int',
      defaultValue: 0,
      description:
        'The iterator cursor. Iteration starts when the cursor is set to 0, and terminates when ' +
        'the cursor returned by the server is 0',
    },
    count: {
      type: 'Int!',
      default: 100,
      description: 'The maximum number of jobs to return per iteration',
    },
  },
});

export const JobSearchPayload = schemaComposer.createObjectTC({
  name: 'JobSearchPayload',
  fields: {
    nextCursor: {
      type: 'Int!',
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
  async resolve(queue: Queue, { filter }): Promise<FilteredJobsResult> {
    const { status, criteria, cursor, count } = filter;

    const { jobs, nextCursor } = await Scripts.getJobsByFilter(
      queue,
      status,
      criteria,
      cursor,
      count,
    );

    return {
      nextCursor,
      jobs,
    };
  },
};
