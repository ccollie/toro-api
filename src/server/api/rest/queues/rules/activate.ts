import { asyncHandler } from '../../middleware';
import { getQueueManager } from './utils';
import { Request, Response } from 'express';

export const activate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const manager = getQueueManager(req);

  const changed = manager.ruleManager.setRuleStatus(id, true);
  if (changed) {
    const rule = manager.getRule(id);
    if (!rule) {
      rule.active = true;
    }
  }

  res.sendStatus(200);
});
