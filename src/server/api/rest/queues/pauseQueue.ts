import { asyncHandler } from '../middleware';
import { Request, Response } from 'express';

export const pauseQueue = asyncHandler(async (req: Request, res: Response) => {
  const { queue } = res.locals;
  await queue.pause();
  res.json({ isPaused: true });
});
