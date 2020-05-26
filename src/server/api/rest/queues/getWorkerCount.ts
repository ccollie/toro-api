import { asyncHandler } from '../middleware';
import { Request, Response } from 'express';

export const getWorkerCount = asyncHandler(
  async (req: Request, res: Response) => {
    const { queue } = res.locals;
    const workers = await queue.getWorkers();
    res.json({ count: workers ? workers.length : 0 });
  },
);
