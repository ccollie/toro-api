import { findJobs as search } from '@alpen/core';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import { JobState } from '../../scalars';

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
        status: {
          type: JobState,
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
    const { queueId, cursor, scanCount, status, expression } = input;
    const queue = accessors.getQueueById(queueId);
    // todo:
    const result = await search(queue, status, expression, cursor, scanCount);
    return {
      nextCursor: result.cursor,
      jobs: result.jobs,
      current: result.current,
      total: result.total,
    };
  },
};
