import boom from '@hapi/boom';
import { asyncHandler } from '../../middleware';
import { getRuleManager } from './utils';
import { Request, Response } from 'express';

export const deleteAlert = asyncHandler(async (req: Request, res: Response) => {
  const { id, alertId } = req.params;
  const rules = getRuleManager(req);

  const deleted = await rules.deleteAlert(id, alertId);
  if (deleted) {
    res.status(200);
  } else {
    throw boom.notFound(`alert #${alertId} not found`);
  }
});
