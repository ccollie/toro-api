import { processJobCommand } from '../../../../models';
import { asyncHandler as wrap } from '../../middleware';
import { RequestHandler, Request, Response } from 'express';

function createJobHandler(cmd: string): RequestHandler {
  return wrap(async (req: Request, res: Response) => {
    const { id } = req.params;
    const queue = res.locals.queue;
    await processJobCommand(cmd, queue, id);
    res.sendStatus(200);
  });
}

export const promoteJob = createJobHandler('promote');
export const retryJob = createJobHandler('retry');
export const deleteJob = createJobHandler('remove');
