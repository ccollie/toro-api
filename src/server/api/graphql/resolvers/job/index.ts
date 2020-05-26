'use strict';
import ms from 'ms';
import { getQueueById } from '../helpers';
import { getJobState } from '../../../../models/jobs';
import { Subscription } from './subscription';
import cronstrue from 'cronstrue/i18n';
import { isNumber } from '../../../../lib';
import { Queue, Job } from 'bullmq';
import { Mutation } from './mutation';

async function getJob(context, queueId, jobId, includeState = false) {
  const queue = getQueueById(context, queueId);
  let job, state;
  if (includeState) {
    const [_job, _state] = await Promise.all([
      queue.getJob(jobId),
      getJobState(queue, jobId),
    ]);
    job = _job;
    state = _state;
  } else {
    job = await queue.getJob(jobId);
  }

  if (job) {
    job.queueId = queueId;
    if (state) job.state = state;
  }
  return job;
}

export const jobResolver = {
  Query: {
    async job(_, { queueId, id }, ctx): Promise<Job> {
      return getJob(ctx, queueId, id);
    },
  },
  JobRepeatOptions: {
    __resolveType(option): string {
      if (option.cron) {
        return 'JobRepeatOptionsCron';
      }
      if (option.hasOwnProperty('every')) {
        return 'JobRepeatOptionsEvery';
      }
      // should not happen
      return 'JobRepeatOption';
    },
  },
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
  Subscription,
  Mutation,
};
