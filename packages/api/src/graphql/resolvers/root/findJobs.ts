import { processSearch } from '@alpen/core';
import { EZContext } from 'graphql-ez';
import { convertJobSearchStatus } from '../queue/utils';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import { JobSearchStatus } from '../../scalars';

export const findJobs: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'FindJobsResult',
    fields: {
      nextCursor: 'ID!',
      jobs: '[Job!]!',
      total: {
        type: 'Int!',
        // eslint-disable-next-line max-len
        description:
          'Total number of jobs in the given state, but not necessarily the filtered count',
      },
      current: {
        type: 'Int!',
        description:
          'Total current index of the end of the last set of jobs returned',
      },
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'FindJobsInput',
      fields: {
        queueId: {
          type: 'ID!',
          description: 'The id of the desired queue',
        },
        scanCount: {
          type: 'Int',
          defaultValue: 20,
        },
        pattern: {
          type: 'String',
          description: 'Optionally filter jobs by id pattern e.g. foo?-*',
        },
        status: {
          type: JobSearchStatus,
          makeOptional: true,
          description: 'Optionally filter jobs by status',
        },
        cursor: {
          type: 'String',
          description: 'The cursor to start from',
        },
        expression: {
          type: 'String!',
          description:
            // eslint-disable-next-line max-len
            'A JS compatible Search expression, e.g (name === "transcode") && (responseTime > 10000)',
        },
      },
    }).NonNull,
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const {
      queueId,
      cursor,
      scanCount,
      status: _status,
      expression,
      pattern,
    } = input;
    const queue = accessors.getQueueById(queueId);

    const status = convertJobSearchStatus(_status);

    const {
      jobs,
      cursor: nextCursor,
      total,
      current,
    } = await processSearch(queue, {
      status,
      filter: expression,
      cursor,
      count: scanCount,
      pattern
    });

    return {
      nextCursor,
      jobs,
      current,
      total,
    };
  },
};
