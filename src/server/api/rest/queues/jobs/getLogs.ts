import { asyncHandler as wrap } from '../../middleware';
import { isNumber } from '../../../../lib';
import { RequestHandler, Request, Response } from 'express';

export const getLogs: RequestHandler = wrap(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { queue } = res.locals;
    const start = isNumber(req.query.start)
      ? parseInt('' + req.query.start)
      : undefined;
    const end = isNumber(req.query.end)
      ? parseInt('' + req.query.end)
      : undefined;
    const logs = await queue.getJobLogs(id, start, end);

    res.status(200).json(logs);
  },
);
