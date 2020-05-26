import { getQueueInfo } from './utils';
import { asyncHandler } from '../middleware';
import { Request, Response } from '/express';

export const getHostQueues = asyncHandler(
  async (req: Request, res: Response) => {
    const { host } = res.locals;
    const queues = await getQueueInfo(host.name, host.getQueues());
    res.json({
      host: host.name,
      queues,
    });
  },
);
