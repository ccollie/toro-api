import { asyncHandler } from '../middleware';
import { Request, Response } from 'express';

export const getJobTypes = asyncHandler(async (req: Request, res: Response) => {
  const { queueManager } = res.locals;
  const jobTypes = await queueManager.getJobTypes();
  res.json(jobTypes);
});
