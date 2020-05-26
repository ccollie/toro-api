'use strict';
import boom from '@hapi/boom';
import { getQueueById, getQueueManager } from '../helpers';
import { getJobState, processJobCommand } from '../../../../models/jobs';
import { Queue } from 'bullmq';
import pSettle from 'p-settle';

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

function createMutationHandler(cmd) {
  return async (parent, args, ctx) => {
    const { queueId, id } = args;
    const manager = getQueueManager(ctx, id);
    const { queue } = manager;

    let job;
    if (cmd === 'remove') {
      // save prev value
      // todo: get state as well ?
      job = await getJob(ctx, queueId, id, true);
    }
    await processJobCommand(cmd, queue, id);
    // todo: raise event
    // refetch job
    if (cmd !== 'remove') {
      job = job || (await getJob(ctx, queueId, id, true));
    }

    if (job) {
      const state = job.state;
      job.queueId = queueId;
      job.state = state;
    }
    return job;
  };
}

// used by all
async function addJob(_, { queueId, jobName, data, options }, ctx) {
  const queue = await getQueueById(ctx, queueId);
  const job = await queue.add(jobName, data, options);
  return {
    job,
  };
}

export const Mutation = {
  promoteJob: createMutationHandler('promote'),
  retryJob: createMutationHandler('retry'),
  deleteJob: createMutationHandler('remove'),
  async addBulkJobs(_, { queueId, jobs }, ctx) {
    const queue = getQueueById(ctx, queueId);
    const jobsRes = await queue.addBulk(jobs);
    return {
      jobs: jobsRes,
    };
  },
  async deleteBulkJobs(_, { queueId, jobIds }, ctx) {
    const manager = getQueueManager(ctx, queueId);
    const jobs = await manager.getMultipleJobsById(jobIds);
    const deletedIds: string[] = [];
    const calls: Function[] = [];
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      calls.push(() => job.remove());
    }
    const settled = await pSettle(calls, { concurrency: 6 }); // todo: configurable ??
    // TODO: publish message for pubsub
    settled.forEach((value, index) => {
      if (value.isFulfilled) deletedIds.push(jobs[index].id);
    });

    return {
      jobIds: deletedIds,
    };
  },
  addJob,
  addRepeatableCronJob: addJob,
  addRepeatableEveryJob: addJob,
  async removeRepeatableJobByKey(_, { id, key }, ctx) {
    const queue = getQueueById(ctx, id);
    await queue.removeRepeatableByKey(key);
    return {};
  },
  async removeRepeatableJobs(_, { id, name, repeat, jobId }, ctx) {
    const queue = getQueueById(ctx, id);
    await queue.removeRepeatable(name, repeat, jobId);
  },
  async updateJob(_, { queueId, jobId, data }, ctx) {
    const queue = getQueueById(ctx, queueId);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw boom.notFound('Job not found!');
    }
    await job.update(data); // complete replacement
    return {
      job,
    };
  },
  async addJobLog(_, { queueId, jobId, row }, ctx) {
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
    };
  },
};
