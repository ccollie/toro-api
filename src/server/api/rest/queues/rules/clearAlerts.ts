import { asyncHandler } from '../../middleware';
import { getRuleManager } from './utils';
import { Request, Response } from 'express';

export const clearAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getRuleManager(req);

  await client.clearAlerts(id);

  res.status(200).json({ status: 'ok' });
});
