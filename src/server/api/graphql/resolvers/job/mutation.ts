'use strict';
import boom from '@hapi/boom';
import nanoid from 'nanoid';
import { getJobById, getQueueById } from '../helpers';
import { processJobCommand } from '../../../../models/jobs';
import { createMutationHandler, createBulkMutationHandler } from './utils';

const promoteJob = createMutationHandler('promote');
const retryJob = createMutationHandler('retry');

const retryBulkJobs = createBulkMutationHandler('retry');
const promoteBulkJobs = createBulkMutationHandler('promote');
const deleteBulkJobs = createBulkMutationHandler('remove');

async function deleteJob(_, { input }, ctx) {
  const { queueId, jobId } = input;
  const queue = getQueueById(ctx, queueId);
  await processJobCommand('remove', queue, jobId);
  return {
    queue,
    id: jobId,
  };
}

async function addJob(_, { input: { queueId, job: jobData } }, ctx) {
  const queue = await getQueueById(ctx, queueId);
  const { name, data, opts } = jobData;
  const job = await queue.add(name, data, opts);
  return {
    job,
    queue,
  };
}

async function addBulkJobs(_, { input }, ctx) {
  const { queueId, jobs } = input;
  const queue = getQueueById(ctx, queueId);
  const jobsRes = await queue.addBulk(jobs);
  return {
    jobs: jobsRes,
    queue,
  };
}

async function addJobLog(_, { input }, ctx) {
  const { queueId, jobId, row } = input;
  const job = await getJobById(ctx, queueId, jobId);
  const count = await job.log(row);

  return {
    id: jobId,
    row,
    count,
    job,
  };
}

async function updateJob(_, { input }, ctx) {
  const { queueId, jobId, data } = input;
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

async function moveJobToFailed(_, { input }, ctx) {
  const { queueId, jobId, reason = 'Failed by user' } = input;
  const queue = getQueueById(ctx, queueId);
  const job = await getJobById(ctx, queueId, jobId);

  const err = new Error(reason);
  const token = nanoid(8);
  await job.moveToFailed(err, token, false);

  return {
    job,
    queue,
  };
}

async function removeRepeatableJobByKey(_, { input }, ctx) {
  const { queueId, key } = input;
  const queue = getQueueById(ctx, queueId);
  await queue.removeRepeatableByKey(key);
  return {
    key,
    queue,
  };
}

async function removeRepeatableJobs(_, { input }, ctx) {
  const { queueId, name, repeatOpts, jobId } = input;
  const queue = getQueueById(ctx, queueId);
  await queue.removeRepeatable(name, repeatOpts, jobId);
  return {
    queue,
  };
}

export const Mutation = {
  addJob,
  addJobLog,
  updateJob,
  deleteJob,
  promoteJob,
  retryJob,
  moveJobToFailed,
  addBulkJobs,
  retryBulkJobs,
  promoteBulkJobs,
  deleteBulkJobs,
  removeRepeatableJobs,
  removeRepeatableJobByKey,
};
