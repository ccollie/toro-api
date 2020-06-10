'use strict';
import boom from '@hapi/boom';
import { getQueueById } from '../helpers';
import { processJobCommand } from '../../../../models/jobs';
import { createMutationHandler, createBulkMutationHandler } from './utils';

const promoteJob = createMutationHandler('promote');
const retryJob = createMutationHandler('retry');

const retryBulkJobs = createBulkMutationHandler('retry');
const promoteBulkJobs = createBulkMutationHandler('promote');
const deleteBulkJobs = createBulkMutationHandler('remove');

async function deleteJob(_, { queueId, id }, ctx) {
  const queue = getQueueById(ctx, queueId);
  await processJobCommand('remove', queue, id);
  return {
    queue,
    id,
  };
}

// used by all
async function addJob(_, { input: { queueId, jobName, data, options } }, ctx) {
  const queue = await getQueueById(ctx, queueId);
  const job = await queue.add(jobName, data, options);
  return {
    job,
    queue,
  };
}

async function addBulkJobs(_, { queueId, jobs }, ctx) {
  const queue = getQueueById(ctx, queueId);
  const jobsRes = await queue.addBulk(jobs);
  return {
    jobs: jobsRes,
    queue,
  };
}

async function addJobLog(_, { queueId, jobId, row }, ctx) {
  const queue = getQueueById(ctx, queueId);
  const job = await queue.getJob(jobId);
  if (!job) {
    throw boom.notFound('Job not found!');
  }
  const count = await job.log(row);

  return {
    id: jobId,
    row,
    count,
    job,
  };
}

async function updateJob(_, { queueId, jobId, data }, ctx) {
  const queue = getQueueById(ctx, queueId);
  const job = await queue.getJob(jobId);
  if (!job) {
    throw boom.notFound('Job not found!');
  }
  await job.update(data); // complete replacement
  return {
    job,
    queue,
  };
}

async function removeRepeatableJobByKey(_, { id, key }, ctx) {
  const queue = getQueueById(ctx, id);
  await queue.removeRepeatableByKey(key);
  return {
    key,
    queue,
  };
}

async function removeRepeatableJobs(_, { id, name, repeat, jobId }, ctx) {
  const queue = getQueueById(ctx, id);
  await queue.removeRepeatable(name, repeat, jobId);
  return {
    queue,
  };
}

export const Mutation = {
  addJob,
  addRepeatableCronJob: addJob,
  addRepeatableEveryJob: addJob,
  addJobLog,
  updateJob,
  deleteJob,
  promoteJob,
  retryJob,
  addBulkJobs,
  retryBulkJobs,
  promoteBulkJobs,
  deleteBulkJobs,
  removeRepeatableJobs,
  removeRepeatableJobByKey,
};
