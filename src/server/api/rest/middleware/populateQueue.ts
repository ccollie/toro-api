import boom from '@hapi/boom';
import { Request, Response } from 'express';

export const populateQueue = (req: Request, res: Response, next) => {
  const { queue } = req.params;
  const { supervisor } = req.app.locals;
  const manager = supervisor.getQueueManager(queue);
  if (!manager) {
    next(boom.notFound(`queue "${queue}" not found`));
  } else {
    res.locals.queueManager = manager;
    res.locals.queue = manager.queue;
    next();
  }
};
