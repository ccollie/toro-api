'use strict';
import { getQueueById } from '../../helpers';

export async function removeRepeatableJobs(_, { input }, ctx) {
  const { queueId, name, repeatOpts, jobId } = input;
  const queue = getQueueById(ctx, queueId);
  await queue.removeRepeatable(name, repeatOpts, jobId);
  return {
    queue,
  };
}
