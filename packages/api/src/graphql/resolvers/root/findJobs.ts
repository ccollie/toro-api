import { DataSearcher } from '@alpen/core';
import { Job } from 'bullmq';
import type { JobType } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import {
  JobStatusEnumType,
} from '../../scalars';
import { JobTC } from '../job/model/Job';
import { FindJobsInput } from '../../typings';

export const findJobs: FieldConfig = {
  type: JobTC.NonNull.List.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'FindJobsInput',
      fields: {
        queueId: {
          type: 'ID!',
          description: 'The id of the desired queue',
        },
        offset: {
          type: 'Int',
          defaultValue: 0,
        },
        limit: {
          type: 'Int',
          defaultValue: 20,
        },
        status: {
          type: JobStatusEnumType,
          isRequired: true,
          defaultValue: 'completed',
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
    { input }: { input: FindJobsInput },
    { accessors }: EZContext,
  ): Promise<Job[]> {
    const {
      queueId,
      offset = 0,
      limit = 10,
      status: _status,
      expression,
    } = input;
    const queue = accessors.getQueueById(queueId);
    const searcher = new DataSearcher(queue);
    // todo:
    const status = _status as JobType;
    return searcher
      .search({
        status,
        search: expression,
        offset,
        limit,
        scanCount: this._config.textSearchScanCount,
      });
  },
};
