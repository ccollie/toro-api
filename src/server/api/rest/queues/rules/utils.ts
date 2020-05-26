import { Request } from 'express';
import { QueueManager, RuleManager } from '../../../../monitor';

/**
 * @returns {QueueManager}
 */
export function getQueueManager(req: Request): QueueManager {
  const { monitor } = req.app.locals.context;
  return monitor.getQueueManager(req.params.queue);
}

/**
 * @returns {RuleManager}
 */
export function getRuleManager(req: Request): RuleManager {
  const queueManager = getQueueManager(req);
  return queueManager && queueManager.ruleManager;
}
