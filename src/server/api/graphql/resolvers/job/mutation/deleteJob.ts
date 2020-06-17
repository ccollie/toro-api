'use strict';
import { getQueueById } from '../../helpers';
import { processJobCommand } from '../../../imports';

export async function deleteJob(_, { input }, ctx) {
  const { queueId, jobId } = input;
  const queue = getQueueById(ctx, queueId);
  await processJobCommand('remove', queue, jobId);
  return {
    queue,
    id: jobId,
  };
}
