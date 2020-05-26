import { asyncHandler } from '../../middleware';
import { getQueueManager } from './utils';

export const list = asyncHandler(async function (req, res) {
  const manager = getQueueManager(req);

  const data = manager.rules.map((rule) => rule.toJSON());
  res.json(data);
});
