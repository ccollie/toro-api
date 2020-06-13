'use strict';
import { getQueueById } from '../../helpers';

export async function addBulkJobs(_, { input }, ctx) {
  const { queueId, jobs } = input;
  const queue = getQueueById(ctx, queueId);
  const jobsRes = await queue.addBulk(jobs);
  return {
    jobs: jobsRes,
    queue,
  };
}
