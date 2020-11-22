import { FieldConfig, JobTC } from '../types';
import { getQueueById } from '../helpers';
import { FilteredJobsResult, getJobsByFilterId } from '../../queues';
import { schemaComposer } from 'graphql-compose';

const JobsByFilterIdInput = schemaComposer.createInputTC({
  name: 'JobsByFilterIdInput',
  fields: {
    queueId: {
      type: 'ID!',
      description: 'The id of the queue to search',
    },
    filterId: {
      type: 'ID!',
      description: 'The id of the filter',
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

export const jobsByFilterId: FieldConfig = {
  description: 'Fetch jobs based on a previously stored filter',
  type: schemaComposer.createObjectTC({
    name: 'JobsByFilterPayload',
    fields: {
      nextCursor: {
        type: 'Int!',
      },
      jobs: [JobTC.NonNull],
    },
  }),
  args: {
    filter: JobsByFilterIdInput.NonNull,
  },
  async resolve(_, { filter }): Promise<FilteredJobsResult> {
    const { queueId, filterId, cursor, count } = filter;

    const queue = getQueueById(queueId);

    const { jobs, nextCursor } = await getJobsByFilterId(
      queue,
      filterId,
      cursor,
      count,
    );

    return {
      nextCursor,
      jobs,
    };
  },
};
