'use strict';
import { getQueueById } from '../../helpers';

export async function addJob(_, { input: { queueId, job: jobData } }, ctx) {
  const queue = await getQueueById(ctx, queueId);
  const { name, data, opts } = jobData;
  const job = await queue.add(name, data, opts);
  return {
    job,
    queue,
  };
}
