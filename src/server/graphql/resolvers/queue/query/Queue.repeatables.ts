import { schemaComposer } from 'graphql-compose';
import { isNumber } from '../../../../lib';
import ms from 'ms';
import cronstrue from 'cronstrue/i18n';
import { FieldConfig } from '../../utils';
import { SortOrderEnum, OrderEnumType } from '../../scalars';
import { RepeatableJob } from '../../../../../types';
import { getQueueManager } from '../../../helpers';
import { Queue } from 'bullmq';

export const repeatableJob = schemaComposer.createObjectTC({
  name: 'RepeatableJob',
  fields: {
    key: 'String!',
    name: 'String',
    id: 'String',
    endDate: {
      type: 'Date',
      description:
        'Date when the repeat job should stop repeating (only with cron).',
    },
    tz: {
      type: 'String',
      description: 'The timezone for the job',
    },
    cron: 'String',
    descr: {
      type: 'String',
      description: 'Human readable description of the cron expression',
      resolve(parent): string {
        const { cron } = parent;
        if (isNumber(cron)) {
          return 'every ' + ms(parseInt(cron));
        }
        return cron ? cronstrue.toString(cron) : '';
      },
    },
    //every: 'Date', //TODO: вроде как должен быть обязательным, проверить - нет в бул-4
    next: 'Date',
  },
});

export const repeatableJobs: FieldConfig = {
  type: repeatableJob.NonNull.List.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'RepeatableJobsInput',
      fields: {
        offset: {
          type: 'Int',
          defaultValue: 0,
        },
        limit: {
          type: 'Int',
          defaultValue: 20,
        },
        order: {
          type: OrderEnumType,
          defaultValue: SortOrderEnum.DESC,
        },
      },
    }),
  },
  async resolve(queue: Queue, { input }): Promise<RepeatableJob[]> {
    const { offset, limit, sortOrder } = input || {};
    const asc = sortOrder === 'ASC';
    const manager = getQueueManager(queue);
    return manager.getRepeatableJobs(offset, limit, asc);
  },
};

export const repeatableJobCount: FieldConfig = {
  type: 'Int!',
  description: 'Returns the number of repeatable jobs',
  async resolve(queue: Queue): Promise<number> {
    const manager = getQueueManager(queue);
    return manager.getRepeatableCount();
  },
};