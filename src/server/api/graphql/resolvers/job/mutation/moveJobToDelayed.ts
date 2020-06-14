'use strict';
import ms from 'ms';
import { getJobById } from '../../helpers';

const DEFAULT_DELAY = ms('1 minute');

export async function moveJobToDelayed(_, { input }, ctx) {
  const { queueId, jobId, delay = DEFAULT_DELAY } = input;
  const job = await getJobById(ctx, queueId, jobId);

  const executeAt = Date.now() + delay;
  await job.moveToDelayed(executeAt);

  return {
    job,
    delay,
    executeAt,
  };
}
