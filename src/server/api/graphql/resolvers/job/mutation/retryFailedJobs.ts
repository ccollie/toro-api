'use strict';
import { getQueueById } from '../../helpers';
import { chunk } from 'lodash';
import { Job } from 'bullmq';
import pSettle from 'p-settle';

/**
 * Retry all queue failed jobs
 */
export async function retryFailedJobs(_, { queueId }, context) {
  const queue = getQueueById(context, queueId);

  const jobs = await queue.getFailed();
  // todo: pawn off to another service so we dont hang
  const chunks = chunk(jobs, 25);

  const result = { success: 0, failure: 0 };
  for (let i = 0; i < chunks.length; i++) {
    const promises = chunks[i].map((job: Job) => job.retry('failed'));
    const settled = await pSettle(promises);
    const successful = settled.filter((x) => x.isFulfilled).length;
    result.success += successful;
    result.failure += settled.length - successful;
  }
  return result;
}
