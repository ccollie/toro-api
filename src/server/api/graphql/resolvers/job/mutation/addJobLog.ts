'use strict';
import { getJobById } from '../../helpers';

export async function addJobLog(_, { input }, ctx) {
  const { queueId, jobId, row } = input;
  const job = await getJobById(ctx, queueId, jobId);
  const count = await job.log(row);

  return {
    id: jobId,
    row,
    count,
    job,
  };
}
