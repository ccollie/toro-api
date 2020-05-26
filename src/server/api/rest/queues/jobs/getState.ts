import { asyncHandler as wrap } from '../../middleware';
import { getJobState } from '../../../../models';
import { RequestHandler, Request, Response } from 'express';

export const getState: RequestHandler = wrap(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const state = await getJobState(res.locals.queue, id);
    if (!state || state === 'unknown') {
      res.sendStatus(404); //
    } else {
      res.json(state);
    }
  },
);
