import boom from '@hapi/boom';
import nanoid from 'nanoid';
import pSettle, {
  PromiseFulfilledResult,
  PromiseRejectedResult,
} from 'p-settle';
import { asyncHandler } from '../../middleware';
import { Request, Response } from 'express';
import { QueueManager } from '../../../../monitor';

const ACTIONS = ['remove', 'retry', 'promote'];

async function processJob(job, action) {
  const state = job.state || (await job.getState()); // todo: use new more efficient lua script

  switch (action) {
    case 'retry': {
      return job.retry(state);
    }
    case 'promote':
      if (state !== 'delayed') {
        throw boom.badRequest(
          `Only "delayed" jobs can be promoted (job ${job.name}#${job.id})`,
        );
      }
      await job.promote();
      break;
    case 'remove':
      if (state === 'active') {
        const token = nanoid();
        await job.discard();
        await job.moveToFailed({ message: 'Aborted by user' }, token);
      } else {
        await job.remove();
      }
      break;
  }
}

export function createBulkActionHandler(action: string) {
  if (!ACTIONS.includes(action)) {
    throw boom.forbidden(`action ${action} not permitted`);
  }

  async function handler(req: Request, res: Response): Promise<void> {
    const queueManager = res.locals.queueManager as QueueManager;

    const { jobs: ids } = req.body;
    const jobs = await queueManager.getMultipleJobsById(ids);

    let status = [];
    if (jobs.length) {
      const promises = jobs.map((job) => processJob(job, action));
      const settled = await pSettle(promises, { concurrency: 4 });
      status = settled.map((info, index) => {
        const result = {
          id: jobs[index].id,
          success: info.isFulfilled,
          value: undefined,
          reason: undefined,
        };
        if (info.isFulfilled) {
          result.value = (info as PromiseFulfilledResult<any>).value;
        } else {
          result.reason = (info as PromiseRejectedResult).reason;
        }
        return result;
      });
    }

    res.json(status);
  }

  return asyncHandler(handler);
}
