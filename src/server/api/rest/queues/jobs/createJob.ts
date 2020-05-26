import { createJob as create } from '../../../../models';
import { asyncHandler } from '../../middleware';
import { Request, Response } from 'express';

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const { name, data = {}, opts = {} } = req.body;
  const queue = res.locals.queue;
  const job = await create(queue, name, data, opts);
  // todo: formatJob
  res.json(job);
});
