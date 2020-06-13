import boom from '@hapi/boom';
import { getQueueById } from '../../helpers';
import { bulkJobHandler, processJobCommand } from '../../../../common/imports';
import { Queue } from 'bullmq';
import { isString } from 'lodash';

export function createBulkMutationHandler(action: string) {
  const BULK_ACTIONS = ['remove', 'retry', 'promote'];
  if (!BULK_ACTIONS.includes(action)) {
    throw boom.forbidden(`action ${action} not permitted`);
  }

  return async function handler(_, { input }, context): Promise<any> {
    const { queueId, jobs: ids } = input;
    const queue = getQueueById(context, queueId);

    const status = await bulkJobHandler(action, queue, ids);

    status.forEach((status) => {
      if (status.reason && !isString(status.reason)) {
        status.reason = status.reason.toString();
      }
    });

    return {
      queue,
      status,
    };
  };
}

export function createMutationHandler(cmd) {
  return async (parent, args, ctx): Promise<any> => {
    const { queueId, jobId } = args;
    const queue = getQueueById(ctx, queueId);

    const job = processJobCommand(cmd, queue, jobId);
    if (job) {
      // job.queueId = queueId;
    }
    return { job, queue };
  };
}
