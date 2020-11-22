import { FieldConfig, JobStatusEnumType, JobTC } from '../types';
import { getQueueById } from '../helpers';
import { getJobsByFilter, FilteredJobsResult } from '../../queues';
import { GraphQLJSONObject, schemaComposer } from 'graphql-compose';

const JobSearchInput = schemaComposer.createInputTC({
  name: 'JobSearchInput',
  fields: {
    queueId: {
      type: 'ID!',
      description: 'The id of the queue to search',
    },
    status: {
      type: JobStatusEnumType,
      makeRequired: true,
      description: 'Search for jobs having this status',
    },
    criteria: {
      type: GraphQLJSONObject,
      makeRequired: true,
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

export const jobSearch: FieldConfig = {
  description:
    'Incrementally iterate over a list of jobs filtered by mongo-compatible query criteria',
  type: schemaComposer.createObjectTC({
    name: 'JobSearchPayload',
    fields: {
      nextCursor: {
        type: 'Int!',
      },
      jobs: [JobTC.NonNull],
    },
  }).NonNull,
  args: {
    filter: JobSearchInput.NonNull,
  },
  async resolve(_, { filter }): Promise<FilteredJobsResult> {
    const { queueId, status, criteria, cursor, count } = filter;

    const queue = getQueueById(queueId);

    const { jobs, nextCursor } = await getJobsByFilter(
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
