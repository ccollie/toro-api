'use strict';
import ms from 'ms';
import { getQueueById } from '../helpers';
import { getJobState } from '../../../../queues/job';
import { Subscription } from './subscription';
import cronstrue from 'cronstrue/i18n';
import { isNumber } from '../../../../lib';
import { Queue } from 'bullmq';
import { Mutation } from './mutation';
import { Query } from './query';

export const jobResolver = {
  Query,
  Mutation,
  Subscription,
  Job: {
    async state(parent, args, ctx): Promise<string> {
      let result = parent.state;
      if (!result) {
        const queue = getQueueById(ctx, parent.queueId);
        result = await getJobState(queue, parent.id);
        return result;
      }
      return result;
    },
    async logs(parent, args, context) {
      const queue = getQueueById(context, parent.queueId);
      return queue.getJobLogs(parent.id, args.start, args.end);
    },
  },
  RepeatableJob: {
    descr(parent): string {
      const { cron } = parent;
      if (isNumber(cron)) {
        return 'every ' + ms(parseInt(cron));
      }
      return cron ? cronstrue.toString(cron) : '';
    },
  },
};
