import boom from '@hapi/boom';
import { asyncHandler } from '../../middleware';
import { getQueueManager } from './utils';
import { Request, Response } from 'express';

export const getRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const manager = getQueueManager(req);

  const rule = manager.getRule(id);
  if (!rule) {
    throw boom.notFound(`Cannot find rule with name "${id}"`);
  }
  const data = rule.toJSON();
  res.json(data);
});
