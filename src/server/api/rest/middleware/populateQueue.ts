import boom from '@hapi/boom';
import { Request, Response } from 'express';

export const populateQueue = (req: Request, res: Response, next) => {
  const { queue, host } = req.params;
  const { monitor } = req.app.locals.context;
  const hostMgr = res.locals.host || monitor.getHost(host);
  const found = hostMgr && hostMgr.getQueue(queue);
  if (!found) {
    const location = host ? `host "${host}"` : 'config';
    next(boom.notFound(`queue "${queue}" not found in ${location}`));
  } else {
    res.locals.queueManager = hostMgr.getQueueManager(queue);
    res.locals.queue = found;
    next();
  }
};
