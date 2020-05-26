// TODO: review
import { Job } from 'bullmq';
import pSettle from 'p-settle';
import { asyncHandler } from '../middleware';
import { chunk } from 'lodash';
import { Request, Response } from 'express';

/**
 * Retry all queue failed getJobs
 * @param {*} req
 * @param {*} res
 */
async function handler(req: Request, res: Response) {
  const queue = res.locals.queue;

  const jobs = await queue.getFailed();
  const chunks = chunk(jobs, 25);

  const result = { success: 0, failure: 0 };
  for (let i = 0; i < chunks.length; i++) {
    const promises = chunks[i].map((job: Job) => job.retry('failed'));
    const settled = await pSettle(promises);
    const successful = settled.filter((x) => x.isFulfilled).length;
    result.success += successful;
    result.failure += settled.length - successful;
  }
  return res.json(result);
}

export const retryFailedJobs = asyncHandler(handler);
