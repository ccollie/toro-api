import boom from '@hapi/boom';
import { Job, JobsOptions, Queue } from 'bullmq';
import { getQueueById, getResolverFields } from '../helpers';
import { getJobState } from '../../../../queues/job';
import {
  validateJobOptions as validateOpts,
  validateBySchema,
  getJobSchema,
  JobSchema,
} from '../../../../queues';
import LRUCache from 'lru-cache';

const cache = new LRUCache({
  max: 200,
  maxAge: 5000,
});

export async function job(_, { queueId, id }, ctx, info): Promise<Job> {
  const queue = getQueueById(ctx, queueId);

  const fieldList = getResolverFields(info);
  const needState = fieldList.includes('state');
  const calls: Array<Promise<any>> = [queue.getJob(id)];
  if (needState) {
    calls.push(getJobState(queue, id));
  }

  const [job, state] = await Promise.all(calls);

  if (job) {
    (job as any).queueId = queueId;
    if (needState) {
      (job as any).state = state;
    }
  } else {
    throw boom.notFound(`Job with id#${id}`);
  }
  return job;
}

function formatError(err): string[] {
  return [err.message];
}

export async function validateJobData(_, { input }, ctx: any): Promise<any> {
  const { queueId, jobName, data = {} } = input;
  const queue = getQueueById(ctx, queueId);

  const key = `${queueId}:${jobName}`;
  let schema = cache.get(key) as JobSchema;
  if (!schema) {
    schema = await getJobSchema(queue, jobName);
    cache.set(key, schema);
  }
  const result = {
    isValid: true,
    errors: [],
  };
  if (schema) {
    try {
      await validateBySchema(jobName, schema, data);
      result.isValid = true;
    } catch (err) {
      result.isValid = false;
      result.errors = formatError(err);
    }
  }
  return result;
}

export async function validateJobOptions(_, { input }) {
  const { options = {} } = input;
  const result = {
    isValid: true,
    errors: [],
  };
  try {
    const opts = (options as any) as JobsOptions;
    validateOpts(opts);
  } catch (err) {
    result.errors = formatError(err);
  }

  return result;
}

export const Query = {
  job,
  validateJobOptions,
  validateJobData,
};
