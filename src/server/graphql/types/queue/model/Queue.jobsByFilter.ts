import { FieldConfig } from '../../../types';
import { schemaComposer } from 'graphql-compose';
import { FilteredJobsResult } from '../../../../commands/scripts';
import { getJobsByFilterId } from '../../../../queues';
import { Queue } from 'bullmq';
import { JobSearchPayload } from './Queue.jobSearch';

const JobsByFilterIdInput = schemaComposer.createInputTC({
  name: 'JobsByFilterIdInput',
  fields: {
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

export const jobsByFilter: FieldConfig = {
  description: 'Fetch jobs based on a previously stored filter',
  type: JobSearchPayload.NonNull,
  args: {
    filter: JobsByFilterIdInput.NonNull,
  },
  async resolve(queue: Queue, { filter }): Promise<FilteredJobsResult> {
    const { filterId, cursor, count } = filter;

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