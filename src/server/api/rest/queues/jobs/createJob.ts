import { createJob as create } from '../../../../queues';
import { asyncHandler } from '../../middleware';
import { Request, Response } from 'express';
import { JobCreationOptions } from '../../../../../types';

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const { name, data = {}, opts = {} } = req.body;
  const queue = res.locals.queue;
  const jobData: JobCreationOptions = {
    name,
    data,
    opts,
  }
  const job = await create(queue, jobData);
  // todo: formatJob
  res.json(job);
});
