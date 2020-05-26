import { getQueueInfo } from './utils';
import { asyncHandler } from '../middleware';
import { Request, Response } from 'express';

export const getQueue = asyncHandler(async (req: Request, res: Response) => {
  const { host } = req.params;
  const { queue } = res.locals;

  const [data] = await getQueueInfo(host, queue);
  if (typeof data !== 'object') {
    res.json({});
  } else {
    res.json({
      name: queue.name,
      host,
      ...data,
    });
  }
});
