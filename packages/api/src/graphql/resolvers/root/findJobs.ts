import { JobSearcher, TSearchResult } from '@alpen/core';
import type { JobType } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import {
  JobStatusEnumType,
} from '../../scalars';
import { FindJobsInput } from '../../typings';

export const findJobs: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'FindJobsResult',
    fields: {
      nextCursor: 'ID!',
      jobs: '[Job!]!',
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
          type: JobStatusEnumType,
        },
        cursor: {
          type: 'String',
          description: 'The cursor to start from',
        },
        expression: {
          type: 'String!',
          // eslint-disable-next-line max-len
          description: 'A JS compatible Search expression, e.g (name === "trancode") && (responseTime > 10000)',
        },
      },
    }).NonNull,
  },
  async resolve(
    _,
    { input },
    { accessors }: EZContext,
  ): Promise<TSearchResult> {
    const {
      queueId,
      cursor,
      scanCount,
      status: _status,
      expression,
    } = input;
    const queue = accessors.getQueueById(queueId);
    const searcher = new JobSearcher(queue);
    // todo:
    const status = _status as JobType;
    return searcher
      .search({
        status,
        search: expression,
        cursor,
        scanCount: scanCount ?? this._config.textSearchScanCount,
      });
  },
};
