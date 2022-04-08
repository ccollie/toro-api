import {
  FilteredJobsResult,
  findJobsByFilter,
  getJobFilter,
} from '@alpen/core';
import boom, { notFound } from '@hapi/boom';
import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { convertJobSearchStatus } from '../utils';
import { FieldConfig, JobSearchStatus as GraphQLStatus } from '../../index';

const JobsByFilterInput = schemaComposer.createInputTC({
  name: 'JobsByFilterInput',
  fields: {
    filterId: {
      type: 'ID',
      description:
        'The id of an existing filter. Specify this or the expression, but not both. ',
    },
    expression: {
      type: 'String',
      description:
        'The filter expression. Specify this or the filterId, but not both.',
    },
    status: {
      type: GraphQLStatus,
      makeOptional: true,
      description:
        'Optional job status to filter on. ' +
        'One of "active", "completed", "failed", "paused", "waiting","delayed".',
    },
    pattern: {
      type: 'String',
      description: 'Job id pattern e.g. "job-*".',
    },
    cursor: {
      type: 'String',
      defaultValue: '',
      description:
        'The iterator cursor. Iteration starts when the cursor is set to null, ' +
        'and terminates when the cursor returned by the server is null',
    },
    count: {
      type: 'Int',
      default: 20,
      description: 'The maximum number of jobs to return per iteration',
    },
  },
});

export const JobsByFilterPayloadTC = schemaComposer.createObjectTC({
  name: 'JobsByFilterPayload',
  fields: {
    cursor: {
      type: 'String',
      description:
        'The updated iteration cursor. Set to null when iteration is complete.',
    },
    jobs: {
      type: '[Job!]!',
      description: 'The jobs matching the filter for the current iteration',
    },
    total: {
      type: 'Int!',
      description: 'The approximate number of jobs to iterate over.',
    },
    current: {
      type: 'Int!',
      description: 'The number of jobs iterated over so far.',
    },
  },
});

export const jobsByFilter: FieldConfig = {
  description:
    'Fetch jobs based on a filter expression or a previously stored filter',
  type: JobsByFilterPayloadTC.NonNull,
  args: {
    input: JobsByFilterInput.NonNull,
  },
  async resolve(queue: Queue, { input }): Promise<FilteredJobsResult> {
    const {
      filterId,
      cursor,
      count,
      expression: expr,
      status: _status,
      pattern: _pattern,
    } = input;

    let expression = expr;
    if (filterId && expression) {
      throw boom.badRequest('Cannot specify both filterId and expression');
    }

    if (!filterId && !expression) {
      throw boom.badRequest('Must specify either filterId or expression');
    }

    const status = convertJobSearchStatus(_status);

    let pattern = _pattern;

    if (filterId) {
      const filter = await getJobFilter(queue, filterId);
      if (!filter)
        throw notFound(
          `No job filter with id "${filterId}" found for queue "${queue.name}"`,
        );
      expression = filter.expression;
      pattern = pattern || filter.pattern;
    }

    const {
      jobs,
      cursor: nextCursor,
      total,
      current,
    } = await findJobsByFilter(queue, {
      status,
      filter: expression,
      cursor,
      pattern,
      count,
    });

    return {
      cursor: nextCursor ? nextCursor.toString() : null,
      jobs,
      total,
      current,
    };
  },
};
