import { asyncHandler } from '../middleware';
import { Request, Response } from 'express';

export const getWorkers = asyncHandler(async (req: Request, res: Response) => {
  const { queueManager } = res.locals;
  const workers = await queueManager.getWorkers();
  res.json(workers);
});
