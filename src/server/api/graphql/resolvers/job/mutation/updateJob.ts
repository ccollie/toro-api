'use strict';
import boom from '@hapi/boom';
import { getQueueById } from '../../helpers';

export async function updateJob(_, { input }, ctx) {
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
