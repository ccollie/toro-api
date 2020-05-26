import { asyncHandler } from '../middleware';
import { Request, Response } from 'express';

export const getJobCounts = asyncHandler(
  async (req: Request, res: Response) => {
    const { queueManager } = req.app.locals;
    let { states } = req.query;

    if (states && !Array.isArray(states)) {
      states = ('' + states).split(',');
    }
    const counts = await queueManager.getJobCounts(states);

    res.json(counts);
  },
);
