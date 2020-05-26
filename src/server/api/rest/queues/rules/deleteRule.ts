import boom from '@hapi/boom';
import { asyncHandler } from '../../middleware';
import { getQueueManager } from './utils';
import { Request, Response } from 'express';

export const res = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const manager = getQueueManager(req);

  const rule = manager.getRule(id);
  if (!rule) {
    throw boom.notFound(`Cannot find rule with name "${id}"`);
  }

  await manager.deleteRule(id);

  res.status(200);
});
