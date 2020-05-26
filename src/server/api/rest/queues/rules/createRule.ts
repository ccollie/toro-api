import boom from '@hapi/boom';
import { asyncHandler as wrap } from '../../middleware';
import { getQueueManager } from './utils';

export const createRule = wrap(async (req, res) => {
  const { id } = req.params;
  const data = req.body.rule;

  const manager = getQueueManager(req);
  const rule = await manager.addRule(data);

  if (!rule) {
    throw boom.notFound(`Cannot find rule with name "${id}"`);
  }

  const json = rule.toJSON();
  res.json(json);
});
