import ms from 'ms';
import boom from '@hapi/boom';
import { isNumber } from '../../../lib/utils';
import { asyncHandler } from '../middleware';
import { Request, Response } from 'express';

const DEFAULT_GRACE_TIME = 5000;
const DEFAULT_LIMIT = 1000;

export const cleanQueue = asyncHandler(async (req: Request, res: Response) => {
  const { queue } = res.locals;
  let {
    status = 'completed',
    limit = DEFAULT_LIMIT,
    grace = DEFAULT_GRACE_TIME,
  } = req.query;

  if (!isNumber(grace)) {
    grace = ms(grace);
  } else {
    grace = parseInt(String(grace));
  }

  if (isNumber(limit)) {
    limit = parseInt(String(limit), 10);
  } else {
    limit = DEFAULT_LIMIT;
  }

  if (!isFinite(limit) || limit < 1) {
    throw boom.badRequest('limit must be a positive integer');
  }

  if (status === 'waiting') {
    status = 'wait';
  }

  const jobs = await queue.clean(grace, limit, status);

  res.json(jobs);
});
