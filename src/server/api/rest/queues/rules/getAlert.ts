import boom from '@hapi/boom';
import { asyncHandler as wrap } from '../../middleware';
import { getQueueManager } from './utils';

export const getAlert = wrap(async (req, res) => {
  const { id, alertId } = req.params;
  const manager = getQueueManager(req);
  const rules = manager.ruleManager;

  const alert = await rules.getAlert(id, alertId);
  if (!alert) {
    throw boom.notFound(`Cannot find alert ${alertId} for rule "${id}"`);
  }
  const data = alert.toJSON();
  res.json(data);
});
