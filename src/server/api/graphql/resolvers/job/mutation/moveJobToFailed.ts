'use strict';
import nanoid from 'nanoid';
import { getQueueById, getJobById } from '../../helpers';

export async function moveJobToFailed(_, { input }, ctx) {
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
