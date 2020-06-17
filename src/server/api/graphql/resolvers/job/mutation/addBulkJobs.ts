'use strict';
import { Queue } from 'bullmq';
import { getQueueById } from '../../helpers';
import { createBulkJobs } from '../../../imports';

export async function addBulkJobs(_, { input }, ctx) {
  const { queueId, jobs: data } = input;
  const queue = getQueueById(ctx, queueId);
  const jobs = await createBulkJobs(queue, data);

  return {
    jobs,
    queue,
  };
}
