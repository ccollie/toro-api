import { asyncHandler } from '../../middleware';
import { getQueueManager } from './utils';
import { Request, Response } from 'express';

export const deactivate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const manager = getQueueManager(req);

  const changed = await manager.ruleManager.setRuleStatus(id, false);
  if (changed) {
    const rule = manager.getRule(id);
    if (!rule) {
      rule.active = true;
    }
  }

  // todo: raise event
  res.sendStatus(200);
});
