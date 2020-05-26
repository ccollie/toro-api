import boom from '@hapi/boom';
import { asyncHandler } from '../../middleware';
import { getQueueManager } from './utils';
import { Request, Response } from 'express';

export const getRuleAlerts = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const manager = getQueueManager(req);
    const rules = manager.ruleManager;

    // todo: parse range query
    const alerts = await rules.getRuleAlerts(id);
    if (!alerts) {
      throw boom.notFound(`Cannot find alerts for rule "${id}"`);
    }

    res.json(alerts);
  },
);
