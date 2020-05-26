import { processJobCommand } from '../../../../models/jobs';
import { asyncHandler } from '../../middleware';

module.exports = function createJobHandler(cmd) {
  const handler = async (req, res) => {
    const { id } = req.params;
    const queue = res.locals.queue;
    await processJobCommand(cmd, queue, id);
    res.sendStatus(200);
  };
  return asyncHandler(handler);
};
