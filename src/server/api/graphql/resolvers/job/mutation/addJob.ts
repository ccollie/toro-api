'use strict';
import { getQueueById } from '../../helpers';
import { createJob, JobCreationOptions } from '../../../imports';

export async function addJob(_, { input: { queueId, job: jobData } }, ctx) {
  const queue = getQueueById(ctx, queueId);
  const { name, data, opts } = jobData;
  const _job: JobCreationOptions = {
    name,
    data,
    opts,
  };
  const job = await createJob(queue, _job);

  return {
    job,
    queue,
  };
}
